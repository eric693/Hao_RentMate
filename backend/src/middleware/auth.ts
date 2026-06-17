import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';

export interface AuthRequest extends Request {
  userId?: string;       // 資料擁有者 id（STAFF=所屬管理員；ADMIN=自己）— 所有資料查詢據此 scope
  authUserId?: string;   // 實際登入者 id
  role?: string;         // ADMIN | STAFF
  permissions?: string[]; // STAFF 可存取的模組鍵
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.authUserId = user.id;
    req.userId = user.ownerId ?? user.id;
    req.role = user.role;
    req.permissions = user.permissions;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// 模組權限檢查：ADMIN 一律放行；STAFF 需具備該模組權限
export function requirePermission(module: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.role === 'ADMIN') { next(); return; }
    if (req.permissions?.includes(module)) { next(); return; }
    res.status(403).json({ error: '您沒有存取此功能的權限，請聯絡管理員' });
  };
}

// 僅限管理員（如使用者管理）
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.role !== 'ADMIN') {
    res.status(403).json({ error: '僅管理員可執行此操作' });
    return;
  }
  next();
}
