import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';
import crypto from 'crypto';
import { sendTenantMessage } from '../services/lineService';

export async function getTenants(req: AuthRequest, res: Response) {
  const tenants = await prisma.tenant.findMany({
    where: { userId: req.userId! },
    include: {
      contracts: {
        where: { status: 'ACTIVE' },
        include: { unit: { include: { property: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tenants);
}

export async function createTenant(req: AuthRequest, res: Response) {
  const { name, phone, email, idNumber, emergencyContact } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: '請填寫姓名與電話' });
    return;
  }
  const tenant = await prisma.tenant.create({
    data: { userId: req.userId!, name, phone, email, idNumber, emergencyContact },
  });
  res.status(201).json(tenant);
}

export async function updateTenant(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const tenant = await prisma.tenant.findFirst({ where: { id, userId: req.userId! } });
  if (!tenant) { res.status(404).json({ error: '找不到租客' }); return; }
  const { name, phone, email, idNumber, emergencyContact } = req.body;
  const updated = await prisma.tenant.update({
    where: { id },
    data: { name, phone, email, idNumber, emergencyContact },
  });
  res.json(updated);
}

export async function deleteTenant(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const tenant = await prisma.tenant.findFirst({ where: { id, userId: req.userId! } });
  if (!tenant) { res.status(404).json({ error: '找不到租客' }); return; }
  const contractCount = await prisma.contract.count({ where: { tenantId: id } });
  if (contractCount > 0) {
    res.status(409).json({ error: `此租客有 ${contractCount} 份合約，請先終止或刪除合約後再刪除租客` });
    return;
  }
  await prisma.tenant.delete({ where: { id } });
  res.json({ success: true });
}

export async function generateTenantBindingCode(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const tenant = await prisma.tenant.findFirst({ where: { id, userId: req.userId! } });
  if (!tenant) { res.status(404).json({ error: '找不到租客' }); return; }
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.tenant.update({
    where: { id },
    data: { lineBindingCode: code, lineBindingCodeExpiry: expiry },
  });
  res.json({ code, expiry });
}

// 自訂訊息透過 LINE 發給租客：未指定 tenantIds 則發給所有已綁定租客
export async function messageTenants(req: AuthRequest, res: Response) {
  const { tenantIds, message } = req.body;
  const text = String(message ?? '').trim();
  if (!text) { res.status(400).json({ error: '請輸入訊息內容' }); return; }

  const where: any = { userId: req.userId!, lineUserId: { not: null } };
  if (Array.isArray(tenantIds) && tenantIds.length > 0) where.id = { in: tenantIds };
  const tenants = await prisma.tenant.findMany({ where, select: { id: true } });
  if (tenants.length === 0) {
    res.status(400).json({ error: '沒有可發送的對象（租客需已綁定 LINE）' });
    return;
  }

  let sent = 0;
  for (const t of tenants) {
    const ok = await sendTenantMessage(t.id, text);
    if (ok) sent++;
  }
  res.json({ sent, total: tenants.length });
}
