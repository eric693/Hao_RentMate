"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requirePermission = requirePermission;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("../app");
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await app_1.prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        req.authUserId = user.id;
        req.userId = user.ownerId ?? user.id;
        req.role = user.role;
        req.permissions = user.permissions;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}
// 模組權限檢查：ADMIN 一律放行；STAFF 需具備該模組權限
function requirePermission(module) {
    return (req, res, next) => {
        if (req.role === 'ADMIN') {
            next();
            return;
        }
        if (req.permissions?.includes(module)) {
            next();
            return;
        }
        res.status(403).json({ error: '您沒有存取此功能的權限，請聯絡管理員' });
    };
}
// 僅限管理員（如使用者管理）
function requireAdmin(req, res, next) {
    if (req.role !== 'ADMIN') {
        res.status(403).json({ error: '僅管理員可執行此操作' });
        return;
    }
    next();
}
