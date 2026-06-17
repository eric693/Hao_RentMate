"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnits = getUnits;
exports.createUnit = createUnit;
exports.updateUnit = updateUnit;
exports.deleteUnit = deleteUnit;
const app_1 = require("../app");
async function getUnits(req, res) {
    const { propertyId } = req.params;
    const property = await app_1.prisma.property.findFirst({ where: { id: propertyId, userId: req.userId } });
    if (!property) {
        res.status(404).json({ error: '找不到物業' });
        return;
    }
    const units = await app_1.prisma.unit.findMany({
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
async function createUnit(req, res) {
    const { propertyId } = req.params;
    const property = await app_1.prisma.property.findFirst({ where: { id: propertyId, userId: req.userId } });
    if (!property) {
        res.status(404).json({ error: '找不到物業' });
        return;
    }
    const { unitNumber, floor, type, monthlyRent, description } = req.body;
    if (!unitNumber || !monthlyRent) {
        res.status(400).json({ error: '請填寫房號與月租金' });
        return;
    }
    const unit = await app_1.prisma.unit.create({
        data: { propertyId, unitNumber, floor: floor ? Number(floor) : null, type, monthlyRent, description },
    });
    res.status(201).json(unit);
}
async function updateUnit(req, res) {
    const { id } = req.params;
    const unit = await app_1.prisma.unit.findFirst({
        where: { id },
        include: { property: true },
    });
    if (!unit || unit.property.userId !== req.userId) {
        res.status(404).json({ error: '找不到房間' });
        return;
    }
    const { unitNumber, floor, type, monthlyRent, status, description } = req.body;
    const updated = await app_1.prisma.unit.update({
        where: { id },
        data: { unitNumber, floor: floor ? Number(floor) : undefined, type, monthlyRent, status, description },
    });
    res.json(updated);
}
async function deleteUnit(req, res) {
    const { id } = req.params;
    const unit = await app_1.prisma.unit.findFirst({ where: { id }, include: { property: true } });
    if (!unit || unit.property.userId !== req.userId) {
        res.status(404).json({ error: '找不到房間' });
        return;
    }
    const contractCount = await app_1.prisma.contract.count({ where: { unitId: id } });
    if (contractCount > 0) {
        res.status(409).json({ error: `此房間有 ${contractCount} 份合約，請先刪除合約後再刪除房間` });
        return;
    }
    await app_1.prisma.unit.delete({ where: { id } });
    res.json({ success: true });
}
