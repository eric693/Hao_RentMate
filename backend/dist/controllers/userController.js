"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULES = void 0;
exports.listUsers = listUsers;
exports.listModules = listModules;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app_1 = require("../app");
// 可指派的模組權限清單（鍵 + 顯示名稱）
exports.MODULES = [
    { key: 'properties', label: '倉儲' },
    { key: 'tenants', label: '租客' },
    { key: 'finance', label: '帳務' },
    { key: 'contracts', label: '合約' },
    { key: 'maintenance', label: '報修' },
    { key: 'listings', label: '空房刊登' },
    { key: 'roi', label: '投報分析' },
    { key: 'market', label: '租金行情' },
    { key: 'settings', label: '設定' },
];
const MODULE_KEYS = exports.MODULES.map((m) => m.key);
const userSelect = {
    id: true, email: true, name: true, role: true, permissions: true, createdAt: true,
};
function sanitizePermissions(input) {
    if (!Array.isArray(input))
        return [];
    return input.filter((k) => typeof k === 'string' && MODULE_KEYS.includes(k));
}
// 列出此管理員建立的所有員工帳號
async function listUsers(req, res) {
    const users = await app_1.prisma.user.findMany({
        where: { ownerId: req.authUserId },
        select: userSelect,
        orderBy: { createdAt: 'asc' },
    });
    res.json(users);
}
// 可指派的模組清單
function listModules(_req, res) {
    res.json(exports.MODULES);
}
// 新增員工帳號（帳密 + 模組權限）
async function createUser(req, res) {
    const { email, password, name, permissions } = req.body;
    if (!email || !password || !name) {
        res.status(400).json({ error: '請填寫 Email、密碼與姓名' });
        return;
    }
    if (String(password).length < 6) {
        res.status(400).json({ error: '密碼至少需 6 碼' });
        return;
    }
    const existing = await app_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ error: '此 Email 已被使用' });
        return;
    }
    const hash = await bcryptjs_1.default.hash(password, 10);
    const user = await app_1.prisma.user.create({
        data: {
            email,
            password: hash,
            name,
            role: 'STAFF',
            ownerId: req.authUserId,
            permissions: sanitizePermissions(permissions),
        },
        select: userSelect,
    });
    res.status(201).json(user);
}
// 更新員工帳號（姓名 / 權限 / 重設密碼）
async function updateUser(req, res) {
    const { id } = req.params;
    const target = await app_1.prisma.user.findFirst({ where: { id, ownerId: req.authUserId } });
    if (!target) {
        res.status(404).json({ error: '找不到使用者' });
        return;
    }
    const { name, permissions, password } = req.body;
    const data = {};
    if (name !== undefined)
        data.name = name;
    if (permissions !== undefined)
        data.permissions = sanitizePermissions(permissions);
    if (password) {
        if (String(password).length < 6) {
            res.status(400).json({ error: '密碼至少需 6 碼' });
            return;
        }
        data.password = await bcryptjs_1.default.hash(password, 10);
    }
    const updated = await app_1.prisma.user.update({ where: { id }, data, select: userSelect });
    res.json(updated);
}
// 刪除員工帳號
async function deleteUser(req, res) {
    const { id } = req.params;
    const target = await app_1.prisma.user.findFirst({ where: { id, ownerId: req.authUserId } });
    if (!target) {
        res.status(404).json({ error: '找不到使用者' });
        return;
    }
    await app_1.prisma.user.delete({ where: { id } });
    res.json({ success: true });
}
