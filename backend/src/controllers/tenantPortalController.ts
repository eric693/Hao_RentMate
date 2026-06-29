import { Response } from 'express';
import { TenantRequest } from '../middleware/tenantAuth';
import { prisma } from '../app';
import { getOrCreateVirtualAccount } from '../services/paymentService';
import { saveBase64Images } from '../services/uploadService';
import { sendLandlordMessage } from '../services/lineService';
import { classifyMaintenance } from '../services/aiService';

// 租客本人 + 現行合約摘要
export async function tenantMe(req: TenantRequest, res: Response) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.tenantId! },
    include: {
      user: { select: { name: true } },
      contracts: {
        where: { status: 'ACTIVE' },
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!tenant) {
    res.status(404).json({ error: '找不到租客' });
    return;
  }
  res.json({
    id: tenant.id,
    name: tenant.name,
    phone: tenant.phone,
    email: tenant.email,
    landlordName: tenant.user.name,
    lineBound: Boolean(tenant.lineUserId),
    activeContracts: tenant.contracts,
  });
}

// 租客的所有合約
export async function tenantContracts(req: TenantRequest, res: Response) {
  const contracts = await prisma.contract.findMany({
    where: { tenantId: req.tenantId! },
    include: { unit: { include: { property: true } } },
    orderBy: { startDate: 'desc' },
  });
  res.json(contracts);
}

// 租客繳費紀錄 + 各期繳款狀態
export async function tenantRentRecords(req: TenantRequest, res: Response) {
  const records = await prisma.rentRecord.findMany({
    where: { contract: { tenantId: req.tenantId! } },
    include: { contract: { include: { unit: { include: { property: true } } } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  res.json(records);
}

// 租客付款資訊：現行合約的虛擬帳號 + 尚未結清金額
export async function tenantPaymentInfo(req: TenantRequest, res: Response) {
  const contract = await prisma.contract.findFirst({
    where: { tenantId: req.tenantId!, status: 'ACTIVE' },
    include: { unit: { include: { property: true } } },
    orderBy: { createdAt: 'desc' },
  });
  if (!contract) {
    res.json({ contract: null, virtualAccount: null, outstanding: [] });
    return;
  }

  const va = await getOrCreateVirtualAccount(contract.id);
  const outstanding = await prisma.rentRecord.findMany({
    where: { contractId: contract.id, status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  const totalDue = outstanding.reduce((sum, r) => {
    const paid = r.paidAmount ? Number(r.paidAmount) : 0;
    return sum + (Number(r.amount) - paid);
  }, 0);

  res.json({
    contract: {
      id: contract.id,
      unitNumber: contract.unit.unitNumber,
      propertyName: contract.unit.property.name,
      monthlyRent: Number(contract.monthlyRent),
    },
    virtualAccount: { bankCode: va.bankCode, accountNumber: va.accountNumber, provider: va.provider },
    outstanding: outstanding.map((r) => ({
      id: r.id,
      year: r.year,
      month: r.month,
      amount: Number(r.amount),
      paidAmount: r.paidAmount ? Number(r.paidAmount) : 0,
      status: r.status,
      dueDate: r.dueDate,
    })),
    totalDue,
  });
}

// 租客的水電費帳單（僅已開帳、且為自己現行承租倉庫；含獨立電錶抄表度數）
export async function tenantUtilityBills(req: TenantRequest, res: Response) {
  const allocations = await prisma.utilityAllocation.findMany({
    where: {
      billed: true,
      unit: { contracts: { some: { tenantId: req.tenantId!, status: 'ACTIVE' } } },
    },
    include: {
      unit: { include: { property: { select: { name: true } } } },
      utilityBill: true,
    },
    orderBy: { utilityBill: { periodEnd: 'desc' } },
  });
  res.json(
    allocations.map((a) => ({
      id: a.id,
      category: a.utilityBill.category, // WATER | ELECTRICITY | GAS
      method: a.utilityBill.method,     // METER | EVEN | AREA | HEADCOUNT | USAGE
      periodStart: a.utilityBill.periodStart,
      periodEnd: a.utilityBill.periodEnd,
      amount: Number(a.amount),
      basis: a.basis != null ? Number(a.basis) : null,             // METER：本期用電度數
      prevReading: a.prevReading != null ? Number(a.prevReading) : null,
      currReading: a.currReading != null ? Number(a.currReading) : null,
      unitPrice: a.unitPrice != null ? Number(a.unitPrice) : null,
      propertyName: a.unit.property.name,
      unitNumber: a.unit.unitNumber,
    })),
  );
}

// 租客的維修申請
export async function tenantMaintenanceList(req: TenantRequest, res: Response) {
  const requests = await prisma.maintenanceRequest.findMany({
    where: { tenantId: req.tenantId! },
    include: { unit: { include: { property: true } } },
    orderBy: { reportedAt: 'desc' },
  });
  res.json(requests);
}

// 租客報修（可附照片，base64 陣列）。AI 自動分類優先級與類別。
export async function tenantCreateMaintenance(req: TenantRequest, res: Response) {
  const { title, description, photos } = req.body;
  if (!title || !description) {
    res.status(400).json({ error: '請填寫標題與說明' });
    return;
  }

  // 找租客現行合約對應的倉庫
  const contract = await prisma.contract.findFirst({
    where: { tenantId: req.tenantId!, status: 'ACTIVE' },
    include: { unit: { include: { property: true } }, tenant: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!contract) {
    res.status(400).json({ error: '查無有效合約，無法報修' });
    return;
  }

  const photoUrls = Array.isArray(photos) ? saveBase64Images(photos, 'maintenance') : [];

  // AI 分類（無 API key 時回傳規則式預設）
  const ai = await classifyMaintenance(title, description);

  const request = await prisma.maintenanceRequest.create({
    data: {
      unitId: contract.unitId,
      tenantId: req.tenantId!,
      title,
      description,
      priority: ai.priority,
      category: ai.category,
      aiClassified: ai.aiClassified,
      photos: photoUrls,
      source: 'TENANT',
    },
    include: { unit: { include: { property: true } } },
  });

  await sendLandlordMessage(
    contract.unit.property.userId,
    `新報修通知（租客提交）\n倉庫：${contract.unit.unitNumber}\n項目：${title}\n類別：${ai.category}\n優先級：${ai.priority}\n說明：${description}${photoUrls.length ? `\n附照片 ${photoUrls.length} 張` : ''}`,
  );

  res.status(201).json(request);
}
