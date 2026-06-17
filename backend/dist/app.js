"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVATE_UPLOAD_DIR = exports.UPLOAD_DIR = exports.prisma = void 0;
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const index_1 = __importDefault(require("./routes/index"));
const reminderCron_1 = require("./jobs/reminderCron");
exports.prisma = new client_1.PrismaClient();
// 上傳目錄（維修照片等，對外靜態服務）
exports.UPLOAD_DIR = path_1.default.resolve(__dirname, '../uploads');
fs_1.default.mkdirSync(path_1.default.join(exports.UPLOAD_DIR, 'maintenance'), { recursive: true });
// 私密上傳目錄（身分證件等），不對外靜態服務，僅透過驗證後的 API 串流
exports.PRIVATE_UPLOAD_DIR = path_1.default.resolve(__dirname, '../private-uploads');
fs_1.default.mkdirSync(path_1.default.join(exports.PRIVATE_UPLOAD_DIR, 'id-documents'), { recursive: true });
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
}));
// 影像以 base64 上傳，放寬 body 上限
app.use(express_1.default.json({ limit: '15mb' }));
// 靜態服務上傳檔案
app.use('/uploads', express_1.default.static(exports.UPLOAD_DIR));
app.use('/api', index_1.default);
app.get('/health', (_req, res) => res.json({ ok: true }));
const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
    console.log(`RentMate API running on http://localhost:${PORT}`);
    (0, reminderCron_1.startReminderJobs)();
});
exports.default = app;
