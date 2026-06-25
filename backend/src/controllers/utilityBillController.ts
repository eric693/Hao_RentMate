import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';
import { computeAllocations, SplitMethod } from '../services/utilityService';
import { sendTenantMessage } from '../services/lineService';

const SPLIT_METHODS: SplitMethod[] = ['EVEN', 'AREA', 'HEADCOUNT', 'USAGE', 'METER'];
const CATEGORY_ZH: Record<string, string> = { WATER: '水費', ELECTRICITY: '電費', GAS: '瓦斯費' };

// 試算：給總額與方法，回傳每間房的分攤（不寫入），供房東確認
export async function previewUtilitySplit(req: AuthRequest, res: Response) {
  const { propertyId, totalAmount, method, inputs } = req.body;
  const property = await prisma.property.findFirst({ where: { id: propertyId, userId: req.userId! } });
  if (!property) {
    res.status(404).json({ error: '找不到據點' });
    return;
  }
  if (!SPLIT_METHODS.includes(method)) {
    res.status(400).json({ error: '分攤方法無效' });
    return;
  }
  const allocations = await computeAllocations(propertyId, Number(totalAmount), method, inputs ?? []);
  res.json({ allocations });
}

// 建立水電單 + 寫入分攤
export async function createUtilityBill(req: AuthRequest, res: Response) {
  const { propertyId, category, periodStart, periodEnd, totalAmount, method, inputs, note } = req.body;
  const property = await prisma.property.findFirst({ where: { id: propertyId, userId: req.userId! } });
  if (!property) {
    res.status(404).json({ error: '找不到據點' });
    return;
  }
  if (!['WATER', 'ELECTRICITY', 'GAS'].includes(category)) {
    res.status(400).json({ error: '類別須為 WATER/ELECTRICITY/GAS' });
    return;
  }
  if (!SPLIT_METHODS.includes(method)) {
    res.status(400).json({ error: '分攤方法無效' });
    return;
  }

  const allocations = await computeAllocations(propertyId, Number(totalAmount) || 0, method, inputs ?? []);
  if (allocations.length === 0) {
    res.status(400).json({
      error: method === 'METER' ? '請至少為一間有電錶的倉庫填寫本期讀數' : '此據點目前無承租中倉庫可分攤',
    });
    return;
  }

  // 獨立電錶模式：總額由各戶加總，而非由房東輸入
  const billTotal = method === 'METER'
    ? allocations.reduce((s, a) => s + a.amount, 0)
    : Number(totalAmount);

  const bill = await prisma.utilityBill.create({
    data: {
      propertyId,
      category,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalAmount: billTotal,
      method,
      note: note ?? undefined,
      allocations: {
        create: allocations.map((a) => ({
          unitId: a.unitId,
          amount: a.amount,
          basis: a.basis ?? undefined,
          prevReading: a.prevReading ?? undefined,
          currReading: a.currReading ?? undefined,
          unitPrice: a.unitPrice ?? undefined,
        })),
      },
    },
    include: { allocations: { include: { unit: true } } },
  });
  res.status(201).json(bill);
}

// 編輯水電分攤帳單（僅限尚未開帳給租客者；會以新參數重算分攤）
export async function updateUtilityBill(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const bill = await prisma.utilityBill.findFirst({
    where: { id, property: { userId: req.userId! } },
    include: { allocations: true },
  });
  if (!bill) { res.status(404).json({ error: '找不到帳單' }); return; }
  if (bill.allocations.some((a) => a.billed)) {
    res.status(400).json({ error: '已開帳給租客的帳單不可編輯' }); return;
  }

  const { category, periodStart, periodEnd, totalAmount, method, inputs, note } = req.body;
  const newCategory = category ?? bill.category;
  const newMethod = (method ?? bill.method) as SplitMethod;
  const newTotal = totalAmount !== undefined && totalAmount !== '' ? Number(totalAmount) : Number(bill.totalAmount);
  if (!['WATER', 'ELECTRICITY', 'GAS'].includes(newCategory)) {
    res.status(400).json({ error: '類別須為 WATER/ELECTRICITY/GAS' }); return;
  }
  if (!SPLIT_METHODS.includes(newMethod)) {
    res.status(400).json({ error: '分攤方法無效' }); return;
  }

  const allocations = await computeAllocations(bill.propertyId, newTotal, newMethod, inputs ?? []);
  if (allocations.length === 0) {
    res.status(400).json({
      error: newMethod === 'METER' ? '請至少為一間有電錶的倉庫填寫本期讀數' : '此據點目前無承租中倉庫可分攤',
    }); return;
  }

  const billTotal = newMethod === 'METER'
    ? allocations.reduce((s, a) => s + a.amount, 0)
    : newTotal;

  await prisma.utilityAllocation.deleteMany({ where: { utilityBillId: id } });
  const updated = await prisma.utilityBill.update({
    where: { id },
    data: {
      category: newCategory,
      method: newMethod,
      totalAmount: billTotal,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      note: note !== undefined ? note : undefined,
      allocations: {
        create: allocations.map((a) => ({
          unitId: a.unitId,
          amount: a.amount,
          basis: a.basis ?? undefined,
          prevReading: a.prevReading ?? undefined,
          currReading: a.currReading ?? undefined,
          unitPrice: a.unitPrice ?? undefined,
        })),
      },
    },
    include: { allocations: { include: { unit: true } } },
  });
  res.json(updated);
}

// 列出水電單
export async function getUtilityBills(req: AuthRequest, res: Response) {
  const { propertyId } = req.query;
  const bills = await prisma.utilityBill.findMany({
    where: {
      property: { userId: req.userId! },
      ...(propertyId ? { propertyId: String(propertyId) } : {}),
    },
    include: { allocations: { include: { unit: true } }, property: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(bills);
}

// 開帳給租客：把分攤金額透過 LINE 通知該倉庫目前在住租客
export async function billUtilityToTenants(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const bill = await prisma.utilityBill.findFirst({
    where: { id, property: { userId: req.userId! } },
    include: {
      property: { select: { name: true } },
      allocations: {
        include: { unit: { include: { contracts: { where: { status: 'ACTIVE' }, include: { tenant: true } } } } },
      },
    },
  });
  if (!bill) {
    res.status(404).json({ error: '找不到水電單' });
    return;
  }

  const periodStr = `${bill.periodStart.toISOString().split('T')[0]} ~ ${bill.periodEnd.toISOString().split('T')[0]}`;
  const isMeter = bill.method === 'METER';
  let notified = 0;
  for (const a of bill.allocations) {
    const contract = a.unit.contracts[0];
    if (!contract?.tenant) continue;
    // 獨立電錶模式：附上抄表明細，金額欄改稱「應繳」
    const meterLine = isMeter && a.currReading != null
      ? `\n讀數：${Number(a.prevReading ?? 0)} → ${Number(a.currReading)}（用電 ${Number(a.basis ?? 0)} 度 × NT$${Number(a.unitPrice ?? 0)}/度）`
      : '';
    const amountLabel = isMeter ? '應繳' : '應分攤';
    const ok = await sendTenantMessage(
      contract.tenant.id,
      `${CATEGORY_ZH[bill.category] ?? '水電費'}通知\n\n${bill.property.name} ${a.unit.unitNumber}\n期間：${periodStr}${meterLine}\n${amountLabel}：NT$${Number(a.amount).toLocaleString()}\n請依房東指定方式繳納，謝謝。`,
    );
    if (ok) notified++;
  }
  await prisma.utilityAllocation.updateMany({ where: { utilityBillId: id }, data: { billed: true } });

  // 獨立電錶：開帳後把本期讀數寫回倉庫，作為下期的「上期讀數」
  if (isMeter) {
    for (const a of bill.allocations) {
      if (a.currReading != null) {
        await prisma.unit.update({ where: { id: a.unitId }, data: { electricLastReading: a.currReading } });
      }
    }
  }
  res.json({ ok: true, notified, total: bill.allocations.length });
}
