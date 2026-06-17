import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UPLOAD_DIR, PRIVATE_UPLOAD_DIR } from '../app';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// 接收 data URL（data:image/png;base64,xxxx），寫入 uploads/<subdir>，回傳可公開存取的相對路徑。
export function saveBase64Image(dataUrl: string, subdir: string): string | null {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const ext = MIME_EXT[match[1]];
  if (!ext) return null;

  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) return null; // 單張上限 8MB

  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const dir = path.join(UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  return `/uploads/${subdir}/${name}`;
}

export function saveBase64Images(dataUrls: string[], subdir: string, max = 6): string[] {
  return dataUrls
    .slice(0, max)
    .map((d) => saveBase64Image(d, subdir))
    .filter((p): p is string => Boolean(p));
}

// 寫入私密目錄，回傳相對路徑（如 id-documents/xxx.png）；僅供驗證後的 API 讀取。
export function savePrivateBase64Image(dataUrl: string, subdir: string): string | null {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const ext = MIME_EXT[match[1]];
  if (!ext) return null;

  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) return null;

  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const dir = path.join(PRIVATE_UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  return `${subdir}/${name}`;
}

// 解析私密檔案的絕對路徑，並防止路徑穿越。
export function resolvePrivateFile(rel: string): string | null {
  const abs = path.resolve(PRIVATE_UPLOAD_DIR, rel);
  if (!abs.startsWith(PRIVATE_UPLOAD_DIR + path.sep)) return null;
  return fs.existsSync(abs) ? abs : null;
}
