import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import routes from './routes/index';
import { startReminderJobs } from './jobs/reminderCron';

export const prisma = new PrismaClient();

// 上傳目錄（維修照片等，對外靜態服務）
export const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
fs.mkdirSync(path.join(UPLOAD_DIR, 'maintenance'), { recursive: true });

// 私密上傳目錄（身分證件等），不對外靜態服務，僅透過驗證後的 API 串流
export const PRIVATE_UPLOAD_DIR = path.resolve(__dirname, '../private-uploads');
fs.mkdirSync(path.join(PRIVATE_UPLOAD_DIR, 'id-documents'), { recursive: true });

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));
// 影像以 base64 上傳，放寬 body 上限
app.use(express.json({ limit: '15mb' }));

// 靜態服務上傳檔案
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api', routes);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`RentMate API running on http://localhost:${PORT}`);
  startReminderJobs();
});

export default app;
