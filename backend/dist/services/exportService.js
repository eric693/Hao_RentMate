"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExcel = buildExcel;
exports.buildPdf = buildPdf;
exports.fileResponseHeaders = fileResponseHeaders;
const XLSX = __importStar(require("xlsx"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const FONT_PATH = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc';
const FONT_PS = 'WenQuanYiZenHei'; // TTC 內的 postscript 名
// 產生 Excel(.xlsx) Buffer
function buildExcel(sheetName, columns, rows) {
    const header = columns.map((c) => c.label);
    const data = rows.map((r) => columns.map((c) => r[c.key] ?? ''));
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = columns.map((c) => ({ wch: Math.max(10, (c.label.length + 4)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
// 產生 PDF Buffer（橫向 A4，含中文字型與簡易表格）
function buildPdf(title, columns, rows) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ size: 'A4', layout: 'landscape', margin: 36 });
        doc.registerFont('cn', FONT_PATH, FONT_PS);
        doc.font('cn');
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;
        // 標題
        doc.fillColor('#4a6741').fontSize(16).text(title, left, doc.page.margins.top);
        doc.fillColor('#888').fontSize(8).text(`匯出時間：${new Date().toLocaleString('zh-TW')}　共 ${rows.length} 筆`, { align: 'left' });
        doc.moveDown(0.5);
        // 欄寬：依 width 權重分配
        const totalW = columns.reduce((s, c) => s + (c.width ?? 1), 0);
        const colW = columns.map((c) => ((c.width ?? 1) / totalW) * pageW);
        let y = doc.y + 4;
        const rowH = 20;
        function drawRow(cells, opts = {}) {
            if (y + rowH > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                y = doc.page.margins.top;
            }
            let x = left;
            if (opts.header)
                doc.rect(left, y, pageW, rowH).fill('#4a6741');
            else if (Math.round((y - doc.page.margins.top) / rowH) % 2 === 1)
                doc.rect(left, y, pageW, rowH).fill('#f5f0eb');
            doc.fillColor(opts.header ? '#ffffff' : '#333333').fontSize(opts.header ? 9 : 8.5);
            columns.forEach((c, i) => {
                const txt = cells[i] ?? '';
                doc.text(String(txt), x + 4, y + 5, { width: colW[i] - 8, height: rowH - 6, ellipsis: true, lineBreak: false });
                x += colW[i];
            });
            y += rowH;
        }
        drawRow(columns.map((c) => c.label), { header: true });
        for (const r of rows)
            drawRow(columns.map((c) => (r[c.key] ?? '') === null ? '' : String(r[c.key] ?? '')));
        if (rows.length === 0) {
            doc.fillColor('#999').fontSize(10).text('（無資料）', left, y + 8);
        }
        doc.end();
    });
}
function fileResponseHeaders(filenameBase, format) {
    const ext = format === 'excel' ? 'xlsx' : 'pdf';
    const mime = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
    const name = encodeURIComponent(`${filenameBase}.${ext}`);
    return { mime, disposition: `attachment; filename*=UTF-8''${name}` };
}
