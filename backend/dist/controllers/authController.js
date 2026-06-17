"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("../app");
async function register(req, res) {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        res.status(400).json({ error: '請填寫所有欄位' });
        return;
    }
    const existing = await app_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(409).json({ error: '此 Email 已被使用' });
        return;
    }
    const hash = await bcryptjs_1.default.hash(password, 10);
    const user = await app_1.prisma.user.create({ data: { email, password: hash, name } });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions } });
}
async function login(req, res) {
    const { email, password } = req.body;
    const user = await app_1.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
        res.status(401).json({ error: 'Email 或密碼錯誤' });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions } });
}
async function me(req, res) {
    const user = await app_1.prisma.user.findUnique({
        where: { id: req.authUserId },
        select: { id: true, email: true, name: true, role: true, permissions: true, createdAt: true },
    });
    res.json(user);
}
