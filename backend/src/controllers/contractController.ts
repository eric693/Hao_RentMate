import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';
import { generateMonthlyRentRecords } from '../services/rentService';
import { sendTenantMessage } from '../services/lineService';
import { checkContractCompliance } from '../services/aiService';
import { savePrivateBase64Image, resolvePrivateFile } from '../services/uploadService';
import crypto from 'crypto';

// 合約合規檢查：依內政部應記載/不得記載事項，產生報告並存入 complianceResult
export async function checkCompliance(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const contract = await prisma.contract.findFirst({
    where: { id, unit: { property: { userId: req.userId! } } },
  });
  if (!contract) {
    res.status(404).json({ error: '找不到合約' });
    return;
  }
  const result = await checkContractCompliance({
    monthlyRent: Number(contract.monthlyRent),
    depositAmount: Number(contract.depositAmount),
    startDate: contract.startDate,
    endDate: contract.endDate,
    rentDueDay: contract.rentDueDay,
    notes: contract.notes,
  });
  await prisma.contract.update({
    where: { id },
    data: { complianceResult: result as any, complianceCheckedAt: new Date() },
  });
  res.json(result);
}

export async function getContracts(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { status } = req.query;

  const properties = await prisma.property.findMany({ where: { userId } });
  const propertyIds = properties.map((p) => p.id);
  const units = await prisma.unit.findMany({ where: { propertyId: { in: propertyIds } } });
  const unitIds = units.map((u) => u.id);

  const contracts = await prisma.contract.findMany({
    where: {
      unitId: { in: unitIds },
      ...(status ? { status: status as any } : {}),
    },
    include: {
      unit: { include: { property: true } },
      tenant: true,
      rentRecords: { orderBy: { dueDate: 'desc' }, take: 1 },
      depositRefund: { include: { deductions: true } },
    },
    orderBy: { endDate: 'asc' },
  });
  res.json(contracts);
}

export async function createContract(req: AuthRequest, res: Response) {
  const { unitId, tenantId, startDate, endDate, monthlyRent, depositAmount, depositPaid, rentDueDay, notes, customTerms } = req.body;
  if (!unitId || !tenantId || !startDate || !endDate || !monthlyRent) {
    res.status(400).json({ error: '請填寫所有必填欄位' });
    return;
  }

  const unit = await prisma.unit.findFirst({ where: { id: unitId }, include: { property: true } });
  if (!unit || unit.property.userId !== req.userId!) {
    res.status(404).json({ error: '找不到倉庫' }); return;
  }

  const contract = await prisma.contract.create({
    data: {
      unitId,
      tenantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      monthlyRent: Number(monthlyRent),
      depositAmount: depositAmount !== undefined && depositAmount !== '' ? Number(depositAmount) : 0,
      depositPaid: depositPaid ?? false,
      rentDueDay: rentDueDay !== undefined && rentDueDay !== '' ? Number(rentDueDay) : 5,
      notes,
      customTerms: customTerms || null,
    },
  });

  await prisma.unit.update({ where: { id: unitId }, data: { status: 'OCCUPIED' } });
  await generateMonthlyRentRecords(contract.id);

  res.status(201).json(contract);
}

export async function updateContract(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const contract = await prisma.contract.findFirst({
    where: { id },
    include: { unit: { include: { property: true } } },
  });
  if (!contract || contract.unit.property.userId !== req.userId!) {
    res.status(404).json({ error: '找不到合約' }); return;
  }

  const { startDate, endDate, monthlyRent, depositAmount, depositPaid, rentDueDay, notes, customTerms, status } = req.body;

  // C：合約一旦完成電子簽署即鎖定內容，僅允許變更狀態（如終止）與押金已付註記，
  //    其餘條款欄位禁止修改，以維持已簽合約不可竄改。
  if (contract.signedAt) {
    const editingTerms = [startDate, endDate, monthlyRent, depositAmount, rentDueDay, notes, customTerms]
      .some((v) => v !== undefined);
    if (editingTerms) {
      res.status(400).json({ error: '合約已完成電子簽署，內容已鎖定不可修改（僅能變更合約狀態）' });
      return;
    }
    const locked = await prisma.contract.update({ where: { id }, data: { status, depositPaid } });
    if (status === 'TERMINATED' || status === 'EXPIRED') {
      await prisma.unit.update({ where: { id: contract.unitId }, data: { status: 'VACANT' } });
    }
    res.json(locked);
    return;
  }

  // A：尚未簽署 —— 可完整編輯合約內容
  const updated = await prisma.contract.update({
    where: { id },
    data: {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      monthlyRent: monthlyRent !== undefined && monthlyRent !== '' ? monthlyRent : undefined,
      depositAmount: depositAmount !== undefined && depositAmount !== '' ? depositAmount : undefined,
      depositPaid,
      rentDueDay: rentDueDay !== undefined && rentDueDay !== '' ? Number(rentDueDay) : undefined,
      notes,
      customTerms: customTerms !== undefined ? (customTerms || null) : undefined,
      status,
    },
  });
  // 同步未繳租金記錄：月租 / 繳款日 / 租期變更時，更新 PENDING、OVERDUE 記錄的金額與繳款日，
  // 已繳清(PAID)與部分繳款(PARTIAL)不動，以保留繳款歷史。
  const termsChanged = monthlyRent !== undefined || rentDueDay !== undefined
    || startDate !== undefined || endDate !== undefined;
  if (termsChanged) {
    const unpaid = await prisma.rentRecord.findMany({
      where: { contractId: id, status: { in: ['PENDING', 'OVERDUE'] } },
    });
    for (const r of unpaid) {
      await prisma.rentRecord.update({
        where: { id: r.id },
        data: { amount: updated.monthlyRent, dueDate: new Date(r.year, r.month - 1, updated.rentDueDay) },
      });
    }
    await generateMonthlyRentRecords(id); // 補上因延長租期而新增的月份
  }

  if (status === 'TERMINATED' || status === 'EXPIRED') {
    await prisma.unit.update({ where: { id: contract.unitId }, data: { status: 'VACANT' } });
  }
  res.json(updated);
}

export async function generateSignInvite(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const contract = await prisma.contract.findFirst({
    where: { id },
    include: {
      unit: { include: { property: true } },
      tenant: true,
    },
  });
  if (!contract || contract.unit.property.userId !== req.userId!) {
    res.status(404).json({ error: '找不到合約' }); return;
  }
  if (contract.signedAt) {
    res.status(400).json({ error: '合約已完成簽署' }); return;
  }

  const token = crypto.randomBytes(24).toString('hex');
  await prisma.contract.update({ where: { id }, data: { signToken: token } });

  const baseUrl = process.env.APP_URL ?? 'http://localhost:6000';
  const signUrl = `${baseUrl}/sign/${token}`;

  const tenant = contract.tenant;
  const unitNum = contract.unit.unitNumber;
  const propName = contract.unit.property.name;

  let sent = false;
  if (tenant.lineUserId) {
    const text = `📄 合約簽署邀請\n\n您好 ${tenant.name}，\n房東邀請您簽署 ${propName} ${unitNum} 的租賃合約。\n\n📋 合約期間：${new Date(contract.startDate).toLocaleDateString('zh-TW')} ～ ${new Date(contract.endDate).toLocaleDateString('zh-TW')}\n💰 月租金：NT$${Number(contract.monthlyRent).toLocaleString()}\n\n請點擊以下連結完成電子簽署：\n${signUrl}\n\n⚠️ 連結僅供本次簽署使用，請勿轉發。`;
    sent = await sendTenantMessage(tenant.id, text);
  }

  res.json({ token, signUrl, sent });
}

export async function getContractByToken(req: Request, res: Response) {
  const { token } = req.params;
  const contract = await prisma.contract.findUnique({
    where: { signToken: token },
    include: {
      unit: { include: { property: true } },
      tenant: true,
    },
  });
  if (!contract) { res.status(404).json({ error: '連結無效或已過期' }); return; }
  res.json({
    id: contract.id,
    signedAt: contract.signedAt,
    signerName: contract.signerName,
    startDate: contract.startDate,
    endDate: contract.endDate,
    monthlyRent: contract.monthlyRent,
    depositAmount: contract.depositAmount,
    rentDueDay: contract.rentDueDay,
    notes: contract.notes,
    customTerms: contract.customTerms,
    unit: { unitNumber: contract.unit.unitNumber },
    property: { name: contract.unit.property.name, address: contract.unit.property.address },
    tenant: { name: contract.tenant.name },
  });
}

export async function signContractByToken(req: Request, res: Response) {
  const { token } = req.params;
  const { signerName, agreed, idDocument } = req.body;
  if (!agreed || !signerName) {
    res.status(400).json({ error: '請填寫姓名並確認同意' }); return;
  }
  if (!idDocument) {
    res.status(400).json({ error: '請上傳證件影像以完成身分驗證' }); return;
  }

  const contract = await prisma.contract.findUnique({ where: { signToken: token } });
  if (!contract) { res.status(404).json({ error: '連結無效' }); return; }
  if (contract.signedAt) { res.status(400).json({ error: '合約已完成簽署' }); return; }

  const idPath = savePrivateBase64Image(idDocument, 'id-documents');
  if (!idPath) {
    res.status(400).json({ error: '證件影像格式不支援（請上傳 JPG/PNG，單張 8MB 內）' }); return;
  }

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { signedAt: new Date(), signerName, signerIdDocument: idPath },
  });
  res.json({ signedAt: updated.signedAt, message: '簽署完成，感謝您！' });
}

// 房東檢視租客簽署時上傳的證件（需登入 + 合約模組權限，僅限該房東的合約）
export async function getSignerIdDocument(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const contract = await prisma.contract.findFirst({
    where: { id, unit: { property: { userId: req.userId! } } },
    select: { signerIdDocument: true },
  });
  if (!contract || !contract.signerIdDocument) {
    res.status(404).json({ error: '查無證件' }); return;
  }
  const abs = resolvePrivateFile(contract.signerIdDocument);
  if (!abs) { res.status(404).json({ error: '證件檔案不存在' }); return; }
  res.sendFile(abs);
}
