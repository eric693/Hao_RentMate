import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';

export async function getUnits(req: AuthRequest, res: Response) {
  const { propertyId } = req.params;
  const property = await prisma.property.findFirst({ where: { id: propertyId, userId: req.userId! } });
  if (!property) { res.status(404).json({ error: '找不到據點' }); return; }

  const units = await prisma.unit.findMany({
    where: { propertyId },
    include: {
      contracts: {
        where: { status: 'ACTIVE' },
        include: { tenant: true },
        take: 1,
      },
      maintenanceRequests: {
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        take: 3,
      },
    },
    orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
  });
  res.json(units);
}

export async function createUnit(req: AuthRequest, res: Response) {
  const { propertyId } = req.params;
  const property = await prisma.property.findFirst({ where: { id: propertyId, userId: req.userId! } });
  if (!property) { res.status(404).json({ error: '找不到據點' }); return; }

  const { unitNumber, floor, type, monthlyRent, description, areaPing, tempControl, palletSlots } = req.body;
  if (!unitNumber || !monthlyRent) {
    res.status(400).json({ error: '請填寫倉庫編號與月租金' });
    return;
  }
  const unit = await prisma.unit.create({
    data: {
      propertyId, unitNumber, floor: floor ? Number(floor) : null, type, monthlyRent, description,
      areaPing: areaPing !== undefined && areaPing !== '' ? Number(areaPing) : null,
      tempControl: tempControl || null,
      palletSlots: palletSlots !== undefined && palletSlots !== '' ? Number(palletSlots) : null,
    },
  });
  res.status(201).json(unit);
}

export async function updateUnit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const unit = await prisma.unit.findFirst({
    where: { id },
    include: { property: true },
  });
  if (!unit || unit.property.userId !== req.userId!) {
    res.status(404).json({ error: '找不到倉庫' }); return;
  }
  const { unitNumber, floor, type, monthlyRent, status, description, areaPing, tempControl, palletSlots } = req.body;
  const updated = await prisma.unit.update({
    where: { id },
    data: {
      unitNumber, floor: floor ? Number(floor) : undefined, type, monthlyRent, status, description,
      areaPing: areaPing !== undefined && areaPing !== '' ? Number(areaPing) : undefined,
      tempControl: tempControl !== undefined ? (tempControl || null) : undefined,
      palletSlots: palletSlots !== undefined && palletSlots !== '' ? Number(palletSlots) : undefined,
    },
  });
  res.json(updated);
}

export async function deleteUnit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const unit = await prisma.unit.findFirst({ where: { id }, include: { property: true } });
  if (!unit || unit.property.userId !== req.userId!) {
    res.status(404).json({ error: '找不到倉庫' }); return;
  }
  const contractCount = await prisma.contract.count({ where: { unitId: id } });
  if (contractCount > 0) {
    res.status(409).json({ error: `此倉庫有 ${contractCount} 份合約，請先刪除合約後再刪除倉庫` });
    return;
  }
  await prisma.unit.delete({ where: { id } });
  res.json({ success: true });
}
