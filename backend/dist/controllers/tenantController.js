"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenants = getTenants;
exports.createTenant = createTenant;
exports.updateTenant = updateTenant;
exports.deleteTenant = deleteTenant;
exports.generateTenantBindingCode = generateTenantBindingCode;
const app_1 = require("../app");
const crypto_1 = __importDefault(require("crypto"));
async function getTenants(req, res) {
    const tenants = await app_1.prisma.tenant.findMany({
        where: { userId: req.userId },
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
async function createTenant(req, res) {
    const { name, phone, email, idNumber, emergencyContact } = req.body;
    if (!name || !phone) {
        res.status(400).json({ error: '請填寫姓名與電話' });
        return;
    }
    const tenant = await app_1.prisma.tenant.create({
        data: { userId: req.userId, name, phone, email, idNumber, emergencyContact },
    });
    res.status(201).json(tenant);
}
async function updateTenant(req, res) {
    const { id } = req.params;
    const tenant = await app_1.prisma.tenant.findFirst({ where: { id, userId: req.userId } });
    if (!tenant) {
        res.status(404).json({ error: '找不到租客' });
        return;
    }
    const { name, phone, email, idNumber, emergencyContact } = req.body;
    const updated = await app_1.prisma.tenant.update({
        where: { id },
        data: { name, phone, email, idNumber, emergencyContact },
    });
    res.json(updated);
}
async function deleteTenant(req, res) {
    const { id } = req.params;
    const tenant = await app_1.prisma.tenant.findFirst({ where: { id, userId: req.userId } });
    if (!tenant) {
        res.status(404).json({ error: '找不到租客' });
        return;
    }
    const contractCount = await app_1.prisma.contract.count({ where: { tenantId: id } });
    if (contractCount > 0) {
        res.status(409).json({ error: `此租客有 ${contractCount} 份合約，請先終止或刪除合約後再刪除租客` });
        return;
    }
    await app_1.prisma.tenant.delete({ where: { id } });
    res.json({ success: true });
}
async function generateTenantBindingCode(req, res) {
    const { id } = req.params;
    const tenant = await app_1.prisma.tenant.findFirst({ where: { id, userId: req.userId } });
    if (!tenant) {
        res.status(404).json({ error: '找不到租客' });
        return;
    }
    const code = crypto_1.default.randomBytes(4).toString('hex').toUpperCase();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await app_1.prisma.tenant.update({
        where: { id },
        data: { lineBindingCode: code, lineBindingCodeExpiry: expiry },
    });
    res.json({ code, expiry });
}
