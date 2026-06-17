import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';

// 可指派的模組權限清單（鍵 + 顯示名稱）
export const MODULES = [
  { key: 'properties', label: '房務' },
  { key: 'tenants', label: '租客' },
  { key: 'finance', label: '帳務' },
  { key: 'contracts', label: '合約' },
  { key: 'maintenance', label: '報修' },
  { key: 'listings', label: '空房刊登' },
  { key: 'roi', label: '投報分析' },
  { key: 'market', label: '租金行情' },
  { key: 'settings', label: '設定' },
];
const MODULE_KEYS = MODULES.map((m) => m.key);

const userSelect = {
  id: true, email: true, name: true, role: true, permissions: true, createdAt: true,
} as const;

function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((k): k is string => typeof k === 'string' && MODULE_KEYS.includes(k));
}

// 列出此管理員建立的所有員工帳號
export async function listUsers(req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    where: { ownerId: req.authUserId! },
    select: userSelect,
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
}

// 可指派的模組清單
export function listModules(_req: AuthRequest, res: Response) {
  res.json(MODULES);
}

// 新增員工帳號（帳密 + 模組權限）
export async function createUser(req: AuthRequest, res: Response) {
  const { email, password, name, permissions } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: '請填寫 Email、密碼與姓名' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: '密碼至少需 6 碼' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: '此 Email 已被使用' });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      name,
      role: 'STAFF',
      ownerId: req.authUserId!,
      permissions: sanitizePermissions(permissions),
    },
    select: userSelect,
  });
  res.status(201).json(user);
}

// 更新員工帳號（姓名 / 權限 / 重設密碼）
export async function updateUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const target = await prisma.user.findFirst({ where: { id, ownerId: req.authUserId! } });
  if (!target) {
    res.status(404).json({ error: '找不到使用者' });
    return;
  }
  const { name, permissions, password } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (permissions !== undefined) data.permissions = sanitizePermissions(permissions);
  if (password) {
    if (String(password).length < 6) {
      res.status(400).json({ error: '密碼至少需 6 碼' });
      return;
    }
    data.password = await bcrypt.hash(password, 10);
  }
  const updated = await prisma.user.update({ where: { id }, data, select: userSelect });
  res.json(updated);
}

// 刪除員工帳號
export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const target = await prisma.user.findFirst({ where: { id, ownerId: req.authUserId! } });
  if (!target) {
    res.status(404).json({ error: '找不到使用者' });
    return;
  }
  await prisma.user.delete({ where: { id } });
  res.json({ success: true });
}
