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
        res.status(404).json({ error: '找不到據點' });
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
        res.status(404).json({ error: '找不到據點' });
        return;
    }
    const { unitNumber, floor, type, monthlyRent, description, areaPing, tempControl, palletSlots } = req.body;
    if (!unitNumber || !monthlyRent) {
        res.status(400).json({ error: '請填寫倉庫編號與月租金' });
        return;
    }
    const unit = await app_1.prisma.unit.create({
        data: {
            propertyId, unitNumber, floor: floor ? Number(floor) : null, type, monthlyRent, description,
            areaPing: areaPing !== undefined && areaPing !== '' ? Number(areaPing) : null,
            tempControl: tempControl || null,
            palletSlots: palletSlots !== undefined && palletSlots !== '' ? Number(palletSlots) : null,
        },
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
        res.status(404).json({ error: '找不到倉庫' });
        return;
    }
    const { unitNumber, floor, type, monthlyRent, status, description, areaPing, tempControl, palletSlots } = req.body;
    const updated = await app_1.prisma.unit.update({
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
async function deleteUnit(req, res) {
    const { id } = req.params;
    const unit = await app_1.prisma.unit.findFirst({ where: { id }, include: { property: true } });
    if (!unit || unit.property.userId !== req.userId) {
        res.status(404).json({ error: '找不到倉庫' });
        return;
    }
    const contractCount = await app_1.prisma.contract.count({ where: { unitId: id } });
    if (contractCount > 0) {
        res.status(409).json({ error: `此倉庫有 ${contractCount} 份合約，請先刪除合約後再刪除倉庫` });
        return;
    }
    await app_1.prisma.unit.delete({ where: { id } });
    res.json({ success: true });
}
