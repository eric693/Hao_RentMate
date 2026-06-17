import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';

export async function getUnits(req: AuthRequest, res: Response) {
  const { propertyId } = req.params;
  const property = await prisma.property.findFirst({ where: { id: propertyId, userId: req.userId! } });
  if (!property) { res.status(404).json({ error: '找不到物業' }); return; }

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
  if (!property) { res.status(404).json({ error: '找不到物業' }); return; }

  const { unitNumber, floor, type, monthlyRent, description } = req.body;
  if (!unitNumber || !monthlyRent) {
    res.status(400).json({ error: '請填寫房號與月租金' });
    return;
  }
  const unit = await prisma.unit.create({
    data: { propertyId, unitNumber, floor: floor ? Number(floor) : null, type, monthlyRent, description },
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
    res.status(404).json({ error: '找不到房間' }); return;
  }
  const { unitNumber, floor, type, monthlyRent, status, description } = req.body;
  const updated = await prisma.unit.update({
    where: { id },
    data: { unitNumber, floor: floor ? Number(floor) : undefined, type, monthlyRent, status, description },
  });
  res.json(updated);
}

export async function deleteUnit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const unit = await prisma.unit.findFirst({ where: { id }, include: { property: true } });
  if (!unit || unit.property.userId !== req.userId!) {
    res.status(404).json({ error: '找不到房間' }); return;
  }
  const contractCount = await prisma.contract.count({ where: { unitId: id } });
  if (contractCount > 0) {
    res.status(409).json({ error: `此房間有 ${contractCount} 份合約，請先刪除合約後再刪除房間` });
    return;
  }
  await prisma.unit.delete({ where: { id } });
  res.json({ success: true });
}
