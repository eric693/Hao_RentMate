import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';
import { buildExcel, buildPdf, fileResponseHeaders, Column } from '../services/exportService';

const money = (v: any) => (v === null || v === undefined ? '' : `NT$${Number(v).toLocaleString()}`);
const date = (v: any) => (v ? new Date(v).toLocaleDateString('zh-TW') : '');
const CAT: Record<string, string> = { WATER: '水費', ELECTRICITY: '電費', GAS: '瓦斯費', MANAGEMENT: '管理費', REPAIR: '維修費', INSURANCE: '保險', INTERNET: '網路', OTHER: '其他' };
const RENT_ST: Record<string, string> = { PAID: '已繳清', PENDING: '待繳', PARTIAL: '部分繳款', OVERDUE: '逾期' };
const CON_ST: Record<string, string> = { ACTIVE: '進行中', EXPIRED: '已到期', TERMINATED: '已終止' };
const MNT_ST: Record<string, string> = { PENDING: '待處理', IN_PROGRESS: '處理中', COMPLETED: '已完成', CANCELLED: '已取消' };
const PRIO: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' };
const METHOD: Record<string, string> = { EVEN: '平均', AREA: '坪數', HEADCOUNT: '人頭', USAGE: '用量' };

interface Dataset {
  module: string;
  title: string;
  columns: Column[];
  fetch: (userId: string) => Promise<Record<string, any>[]>;
}

const DATASETS: Record<string, Dataset> = {
  tenants: {
    module: 'tenants', title: '租客名單',
    columns: [
      { key: 'name', label: '姓名' }, { key: 'phone', label: '電話' }, { key: 'email', label: 'Email', width: 1.5 },
      { key: 'unit', label: '租屋處' }, { key: 'line', label: 'LINE 綁定' },
    ],
    fetch: async (userId) => {
      const tenants = await prisma.tenant.findMany({
        where: { userId },
        include: { contracts: { where: { status: 'ACTIVE' }, include: { unit: { include: { property: true } } } } },
        orderBy: { createdAt: 'asc' },
      });
      return tenants.map((t) => ({
        name: t.name, phone: t.phone, email: t.email ?? '',
        unit: t.contracts.map((c) => `${c.unit.property.name} ${c.unit.unitNumber}`).join('、'),
        line: t.lineUserId ? '已綁定' : '未綁定',
      }));
    },
  },
  contracts: {
    module: 'contracts', title: '合約清單',
    columns: [
      { key: 'unit', label: '房間', width: 1.3 }, { key: 'tenant', label: '租客' },
      { key: 'start', label: '起租' }, { key: 'end', label: '到期' },
      { key: 'rent', label: '月租' }, { key: 'deposit', label: '押金' },
      { key: 'status', label: '狀態' }, { key: 'signed', label: '簽署' },
    ],
    fetch: async (userId) => {
      const props = await prisma.property.findMany({ where: { userId }, select: { id: true } });
      const units = await prisma.unit.findMany({ where: { propertyId: { in: props.map((p) => p.id) } }, select: { id: true } });
      const contracts = await prisma.contract.findMany({
        where: { unitId: { in: units.map((u) => u.id) } },
        include: { unit: { include: { property: true } }, tenant: true },
        orderBy: { endDate: 'asc' },
      });
      return contracts.map((c) => ({
        unit: `${c.unit.property.name} ${c.unit.unitNumber}`, tenant: c.tenant.name,
        start: date(c.startDate), end: date(c.endDate), rent: money(c.monthlyRent), deposit: money(c.depositAmount),
        status: CON_ST[c.status] ?? c.status, signed: c.signedAt ? `已簽 ${date(c.signedAt)}` : '未簽署',
      }));
    },
  },
  expenses: {
    module: 'finance', title: '支出記錄',
    columns: [
      { key: 'date', label: '日期' }, { key: 'category', label: '類別' },
      { key: 'description', label: '說明', width: 2 }, { key: 'amount', label: '金額' }, { key: 'confirmed', label: '狀態' },
    ],
    fetch: async (userId) => {
      const props = await prisma.property.findMany({ where: { userId }, select: { id: true } });
      const units = await prisma.unit.findMany({ where: { propertyId: { in: props.map((p) => p.id) } }, select: { id: true } });
      const expenses = await prisma.expense.findMany({
        where: { OR: [{ userId }, { propertyId: { in: props.map((p) => p.id) } }, { unitId: { in: units.map((u) => u.id) } }] },
        orderBy: { date: 'desc' },
      });
      return expenses.map((e) => ({
        date: date(e.date), category: CAT[e.category] ?? e.category, description: e.description ?? '',
        amount: money(e.amount), confirmed: e.confirmedAt ? '已確認' : '未確認',
      }));
    },
  },
  'rent-records': {
    module: 'finance', title: '租金繳費記錄',
    columns: [
      { key: 'period', label: '年月' }, { key: 'unit', label: '房間', width: 1.3 }, { key: 'tenant', label: '租客' },
      { key: 'amount', label: '應收' }, { key: 'paid', label: '已收' }, { key: 'status', label: '狀態' }, { key: 'due', label: '到期日' },
    ],
    fetch: async (userId) => {
      const props = await prisma.property.findMany({ where: { userId }, select: { id: true } });
      const units = await prisma.unit.findMany({ where: { propertyId: { in: props.map((p) => p.id) } }, select: { id: true } });
      const records = await prisma.rentRecord.findMany({
        where: { contract: { unitId: { in: units.map((u) => u.id) } } },
        include: { contract: { include: { unit: { include: { property: true } }, tenant: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
      return records.map((r) => ({
        period: `${r.year}/${r.month}`, unit: `${r.contract.unit.property.name} ${r.contract.unit.unitNumber}`,
        tenant: r.contract.tenant.name, amount: money(r.amount), paid: money(r.paidAmount),
        status: RENT_ST[r.status] ?? r.status, due: date(r.dueDate),
      }));
    },
  },
  'utility-bills': {
    module: 'finance', title: '水電分攤帳單',
    columns: [
      { key: 'period', label: '期間', width: 1.5 }, { key: 'category', label: '類別' }, { key: 'property', label: '物業' },
      { key: 'total', label: '總額' }, { key: 'method', label: '分攤' }, { key: 'allocations', label: '分攤明細', width: 2.5 },
    ],
    fetch: async (userId) => {
      const bills = await prisma.utilityBill.findMany({
        where: { property: { userId } },
        include: { allocations: { include: { unit: true } }, property: true },
        orderBy: { createdAt: 'desc' },
      });
      return bills.map((b) => ({
        period: `${date(b.periodStart)}~${date(b.periodEnd)}`, category: CAT[b.category] ?? b.category, property: b.property.name,
        total: money(b.totalAmount), method: METHOD[b.method] ?? b.method,
        allocations: b.allocations.map((a) => `${a.unit.unitNumber}:${money(a.amount)}`).join('、'),
      }));
    },
  },
  maintenance: {
    module: 'maintenance', title: '報修記錄',
    columns: [
      { key: 'date', label: '日期' }, { key: 'unit', label: '房間', width: 1.3 }, { key: 'title', label: '標題', width: 1.5 },
      { key: 'category', label: '類別' }, { key: 'priority', label: '優先' }, { key: 'status', label: '狀態' }, { key: 'reporter', label: '報修人' },
    ],
    fetch: async (userId) => {
      const requests = await prisma.maintenanceRequest.findMany({
        where: { unit: { property: { userId } } },
        include: { unit: { include: { property: true } }, tenant: true },
        orderBy: { reportedAt: 'desc' },
      });
      return requests.map((m) => ({
        date: date(m.reportedAt), unit: `${m.unit.property.name} ${m.unit.unitNumber}`, title: m.title,
        category: m.category ?? '', priority: PRIO[m.priority] ?? m.priority, status: MNT_ST[m.status] ?? m.status,
        reporter: m.tenant?.name ?? '房東',
      }));
    },
  },
};

export async function exportData(req: AuthRequest, res: Response) {
  const { type } = req.params;
  const format = (req.query.format === 'pdf' ? 'pdf' : 'excel') as 'excel' | 'pdf';
  const ds = DATASETS[type];
  if (!ds) { res.status(404).json({ error: '不支援的匯出類型' }); return; }

  // 權限：ADMIN 放行；STAFF 需具該模組權限
  if (req.role !== 'ADMIN' && !req.permissions?.includes(ds.module)) {
    res.status(403).json({ error: '您沒有匯出此資料的權限' }); return;
  }

  const rows = await ds.fetch(req.userId!);
  const { mime, disposition } = fileResponseHeaders(ds.title, format);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', disposition);

  if (format === 'excel') {
    res.send(buildExcel(ds.title, ds.columns, rows));
  } else {
    res.send(await buildPdf(ds.title, ds.columns, rows));
  }
}
