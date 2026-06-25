import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../app';
import { buildExcel, buildPdf, fileResponseHeaders, Column } from '../services/exportService';
import { computeROI } from './roiController';
import { computeDashboard } from './dashboardController';
import { computeFinanceOverview } from './collectionWorkbenchController';

const money = (v: any) => (v === null || v === undefined ? '' : `NT$${Number(v).toLocaleString()}`);
const date = (v: any) => (v ? new Date(v).toLocaleDateString('zh-TW') : '');
const CAT: Record<string, string> = { WATER: '水費', ELECTRICITY: '電費', GAS: '瓦斯費', MANAGEMENT: '管理費', REPAIR: '維修費', INSURANCE: '保險', INTERNET: '網路', OTHER: '其他' };
const RENT_ST: Record<string, string> = { PAID: '已繳清', PENDING: '待繳', PARTIAL: '部分繳款', OVERDUE: '逾期' };
const CON_ST: Record<string, string> = { ACTIVE: '進行中', EXPIRED: '已到期', TERMINATED: '已終止' };
const MNT_ST: Record<string, string> = { PENDING: '待處理', IN_PROGRESS: '處理中', COMPLETED: '已完成', CANCELLED: '已取消' };
const PRIO: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' };
const METHOD: Record<string, string> = { EVEN: '平均', AREA: '坪數', HEADCOUNT: '人頭', USAGE: '用量', METER: '獨立電錶' };
const PAY_ST: Record<string, string> = { MATCHED: '已對帳', UNMATCHED: '未對帳', PENDING: '待處理', PARTIAL: '部分' };

interface Dataset {
  module: string;
  title: string;
  columns: Column[];
  fetch: (userId: string) => Promise<Record<string, any>[]>;
}

const DATASETS: Record<string, Dataset> = {
  warehouses: {
    module: 'properties', title: '倉庫清單',
    columns: [
      { key: 'property', label: '據點', width: 1.3 }, { key: 'unitNumber', label: '倉庫編號' },
      { key: 'floor', label: '樓層' }, { key: 'area', label: '面積(坪)' }, { key: 'temp', label: '溫控' },
      { key: 'pallet', label: '棧板位' }, { key: 'rent', label: '月租金' }, { key: 'status', label: '狀態' }, { key: 'tenant', label: '承租租客' },
    ],
    fetch: async (userId) => {
      const props = await prisma.property.findMany({
        where: { userId },
        include: {
          units: {
            include: { contracts: { where: { status: 'ACTIVE' }, include: { tenant: true } } },
            orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
          },
        },
        orderBy: { name: 'asc' },
      });
      const rows: Record<string, any>[] = [];
      for (const p of props) for (const u of p.units) {
        rows.push({
          property: p.name, unitNumber: u.unitNumber, floor: u.floor ?? '',
          area: u.areaPing != null ? Number(u.areaPing) : '', temp: u.tempControl ?? '',
          pallet: u.palletSlots ?? '', rent: money(u.monthlyRent),
          status: u.status === 'OCCUPIED' ? '已出租' : '空置',
          tenant: u.contracts[0]?.tenant.name ?? '',
        });
      }
      return rows;
    },
  },
  tenants: {
    module: 'tenants', title: '租客名單',
    columns: [
      { key: 'name', label: '姓名' }, { key: 'phone', label: '電話' }, { key: 'email', label: 'Email', width: 1.5 },
      { key: 'unit', label: '承租倉庫' }, { key: 'line', label: 'LINE 綁定' },
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
      { key: 'unit', label: '倉庫', width: 1.3 }, { key: 'tenant', label: '租客' },
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
      { key: 'period', label: '年月' }, { key: 'unit', label: '倉庫', width: 1.3 }, { key: 'tenant', label: '租客' },
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
      { key: 'period', label: '期間', width: 1.5 }, { key: 'category', label: '類別' }, { key: 'property', label: '據點' },
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
      { key: 'date', label: '日期' }, { key: 'unit', label: '倉庫', width: 1.3 }, { key: 'title', label: '標題', width: 1.5 },
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
  payments: {
    module: 'finance', title: '金流對帳記錄',
    columns: [
      { key: 'paidAt', label: '入帳時間', width: 1.3 }, { key: 'amount', label: '金額' }, { key: 'payer', label: '付款人' },
      { key: 'unit', label: '對應倉庫', width: 1.5 }, { key: 'tenant', label: '租客' },
      { key: 'status', label: '狀態' }, { key: 'reconciled', label: '對帳時間', width: 1.3 },
    ],
    fetch: async (userId) => {
      const contracts = await prisma.contract.findMany({ where: { unit: { property: { userId } } }, select: { id: true } });
      const payments = await prisma.payment.findMany({
        where: { OR: [{ contractId: { in: contracts.map((c) => c.id) } }, { contractId: null, status: 'UNMATCHED' }] },
        include: { contract: { include: { tenant: true, unit: { include: { property: true } } } } },
        orderBy: { paidAt: 'desc' },
      });
      return payments.map((p) => ({
        paidAt: date(p.paidAt), amount: money(p.amount), payer: p.payerName ?? '',
        unit: p.contract ? `${p.contract.unit.property.name} ${p.contract.unit.unitNumber}` : '（未對應）',
        tenant: p.contract?.tenant.name ?? '', status: PAY_ST[p.status] ?? p.status, reconciled: date(p.reconciledAt),
      }));
    },
  },
  roi: {
    module: 'roi', title: '投報分析',
    columns: [
      { key: 'name', label: '據點', width: 1.5 }, { key: 'units', label: '房數' }, { key: 'occupied', label: '在住' },
      { key: 'expected', label: '應收' }, { key: 'collected', label: '已收' }, { key: 'rate', label: '收款率' },
      { key: 'expenses', label: '支出' }, { key: 'net', label: '淨收益' }, { key: 'vacancy', label: '空置天數' }, { key: 'roi', label: '年化ROI' },
    ],
    fetch: async (userId) => {
      const result = await computeROI(userId);
      return result.map((r) => ({
        name: r.name, units: r.totalUnits, occupied: r.occupiedUnits,
        expected: money(r.totalExpected), collected: money(r.totalCollected), rate: `${r.collectionRate}%`,
        expenses: money(r.totalExpenses), net: money(r.netIncome), vacancy: `${r.vacancyDays} 天`,
        roi: r.annualizedROI !== null ? `${r.annualizedROI}%` : '—',
      }));
    },
  },
  dashboard: {
    module: '', title: '營運總覽摘要',
    columns: [{ key: 'item', label: '項目', width: 1.5 }, { key: 'value', label: '數值', width: 2 }],
    fetch: async (userId) => {
      const d = await computeDashboard(userId);
      return [
        { item: '統計月份', value: `${d.rentSummary.year} 年 ${d.rentSummary.month} 月` },
        { item: '本月應收租金', value: money(d.rentSummary.totalRent) },
        { item: '本月已收租金', value: money(d.rentSummary.collectedRent) },
        { item: '收款率', value: `${d.rentSummary.collectionRate}%` },
        { item: '已繳筆數', value: d.rentSummary.paidCount },
        { item: '待繳筆數', value: d.rentSummary.pendingCount },
        { item: '逾期筆數', value: d.rentSummary.overdueCount },
        { item: '逾期金額', value: money(d.rentSummary.overdueAmount) },
        { item: '總倉庫數', value: d.occupancy.total },
        { item: '已出租', value: d.occupancy.occupied },
        { item: '出租率', value: `${d.occupancy.rate}%` },
        { item: '待處理報修', value: d.pendingMaintenance },
        { item: '待辦事項總數', value: d.totalTodos },
        { item: '營運摘要', value: d.operationSummary },
      ];
    },
  },
  'finance-overview': {
    module: 'finance', title: '財務總覽摘要',
    columns: [{ key: 'item', label: '項目', width: 1.5 }, { key: 'value', label: '數值', width: 2 }],
    fetch: async (userId) => {
      const now = new Date();
      const f = await computeFinanceOverview(userId, now.getFullYear(), now.getMonth() + 1);
      const rows: Record<string, any>[] = [
        { item: '統計月份', value: `${f.year} 年 ${f.month} 月` },
        { item: '應收租金', value: money(f.current.total) },
        { item: '已收租金', value: money(f.current.collected) },
        { item: '待收租金', value: money(f.current.pending) },
        { item: '逾期租金', value: money(f.current.overdue) },
        { item: '收款率', value: `${f.current.rate}%` },
        { item: '水電費支出', value: money(f.current.utility) },
        { item: '其他支出', value: money(f.current.expenses) },
        { item: '較上月已收', value: `${f.mom.collected >= 0 ? '+' : ''}${f.mom.collected}%` },
      ];
      for (const e of f.expenseBreakdown) rows.push({ item: `支出明細－${e.label}`, value: `${money(e.amount)}（${e.pct}%）` });
      return rows;
    },
  },
};

export async function exportData(req: AuthRequest, res: Response) {
  const { type } = req.params;
  const format = (req.query.format === 'pdf' ? 'pdf' : 'excel') as 'excel' | 'pdf';
  const ds = DATASETS[type];
  if (!ds) { res.status(404).json({ error: '不支援的匯出類型' }); return; }

  // 權限：ADMIN 放行；空模組(如總覽)任何登入者皆可；其餘 STAFF 需具該模組權限
  if (req.role !== 'ADMIN' && ds.module && !req.permissions?.includes(ds.module)) {
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
