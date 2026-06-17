import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: '請填寫所有欄位' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: '此 Email 已被使用' });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, name } });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Email 或密碼錯誤' });
    return;
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions } });
}

export async function me(req: Request & { authUserId?: string }, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.authUserId! },
    select: { id: true, email: true, name: true, role: true, permissions: true, createdAt: true },
  });
  res.json(user);
}
