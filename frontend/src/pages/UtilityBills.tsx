import { useEffect, useState } from 'react';
import { Plus, Droplets, Zap, Flame, Building2, Split, Send, X } from 'lucide-react';
import api from '../api/client';
import { Expense, Property } from '../types';
import ExportButtons from '../components/ExportButtons';

interface Allocation { unitId: string; unitNumber: string; amount: number; basis: number | null; prevReading?: number; currReading?: number; unitPrice?: number }
interface UtilityBill {
  id: string;
  propertyId: string;
  category: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  method: string;
  property?: { name: string };
  allocations: Array<{ id: string; unitId?: string; amount: number; basis: number | null; billed: boolean; prevReading?: number | null; currReading?: number | null; unitPrice?: number | null; unit: { unitNumber: string } }>;
}
const METHOD_LABEL: Record<string, string> = { EVEN: '平均', AREA: '坪數', HEADCOUNT: '人頭', USAGE: '用量', METER: '獨立電錶' };

const UTILITY_LABELS: Record<string, string> = { WATER: '水費', ELECTRICITY: '電費', GAS: '瓦斯費' };
const UTILITY_COLORS: Record<string, string> = { WATER: '#60a5fa', ELECTRICITY: '#f59e0b', GAS: '#f97316' };
const UTILITY_ICONS: Record<string, React.ReactNode> = {
  WATER: <Droplets className="w-3.5 h-3.5" />,
  ELECTRICITY: <Zap className="w-3.5 h-3.5" />,
  GAS: <Flame className="w-3.5 h-3.5" />,
};

export default function UtilityBills() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [editBill, setEditBill] = useState<UtilityBill | null>(null);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [year, month]);

  async function fetchData() {
    setLoading(true);
    const [r, p, b] = await Promise.all([
      api.get(`/expenses?year=${year}&month=${month}`),
      api.get('/properties'),
      api.get('/utility-bills'),
    ]);
    setExpenses(r.data.filter((e: Expense) => ['WATER', 'ELECTRICITY', 'GAS'].includes(e.category)));
    setProperties(p.data);
    setBills(b.data);
    setLoading(false);
  }

  async function billToTenants(id: string) {
    const r = await api.post(`/utility-bills/${id}/bill`);
    let msg = `已透過 LINE 通知 ${r.data.notified} / ${r.data.total} 位租客`;
    if (r.data.unbound > 0) {
      msg += `\n\n⚠️ ${r.data.unbound} 位尚未綁定 LINE、未收到：\n${(r.data.unboundNames ?? []).join('、')}\n可至「帳號設定」傳登入連結或請其綁定。`;
    }
    alert(msg);
    fetchData();
  }

  async function deleteExpense(id: string) {
    if (!confirm('確定刪除此帳單？')) return;
    await api.delete(`/expenses/${id}`);
    fetchData();
  }

  const totalByCategory: Record<string, number> = {};
  for (const e of expenses) {
    totalByCategory[e.category] = (totalByCategory[e.category] ?? 0) + Number(e.amount);
  }

  const allUnits = properties.flatMap((p) =>
    p.units.map((u) => ({ ...u, propertyName: p.name, propertyId: p.id }))
  );

  return (
    <div className="px-6 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">水電帳單</h1>
          <p className="text-xs text-gray-400 mt-0.5">{year} 年 {month} 月公用費用管理</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input text-xs py-1.5 px-2 w-20">
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input text-xs py-1.5 px-2 w-16">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} 月</option>)}
          </select>
          <ExportButtons type="utility-bills" />
          <button onClick={() => setShowSplit(true)} className="btn-secondary text-sm flex items-center gap-1">
            <Split className="w-4 h-4" />費用分攤
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" />新增帳單
          </button>
        </div>
      </div>

      {/* Category summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {['WATER', 'ELECTRICITY', 'GAS'].map((cat) => (
          <div key={cat} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: UTILITY_COLORS[cat] }}>{UTILITY_ICONS[cat]}</span>
              <span className="text-xs text-gray-500">{UTILITY_LABELS[cat]}</span>
            </div>
            <div className="text-lg font-bold text-gray-800">NT${(totalByCategory[cat] ?? 0).toLocaleString()}</div>
            <div className="text-xs text-gray-400">{expenses.filter((e) => e.category === cat).length} 筆</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-12">
          <div className="text-gray-400 text-sm mb-3">本月無水電帳單</div>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1 mx-auto">
            <Plus className="w-4 h-4" />新增帳單
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-4 py-3 font-medium">類別</th>
                <th className="text-left px-4 py-3 font-medium">據點 / 倉庫</th>
                <th className="text-left px-4 py-3 font-medium">說明</th>
                <th className="text-left px-4 py-3 font-medium">日期</th>
                <th className="text-right px-4 py-3 font-medium">金額</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-warm/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span style={{ color: UTILITY_COLORS[e.category] }}>{UTILITY_ICONS[e.category]}</span>
                      <span className="font-medium text-gray-700">{UTILITY_LABELS[e.category]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Building2 className="w-3 h-3" />
                      <span>{e.property?.name ?? '—'}</span>
                      {e.unit?.unitNumber && <span className="text-gray-400">/ {e.unit.unitNumber}</span>}
                      {!e.property && !e.unit && <span className="text-gray-300">未指定</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(e.date).toLocaleDateString('zh-TW')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">NT${Number(e.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteExpense(e.id)} className="text-xs text-red-400 hover:text-red-600">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分攤帳單 */}
      {bills.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Split className="w-4 h-4 text-brand" />水電開帳明細
          </h2>
          <div className="space-y-3">
            {bills.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span style={{ color: UTILITY_COLORS[b.category] }}>{UTILITY_ICONS[b.category]}</span>
                    <span className="font-medium text-gray-700">{UTILITY_LABELS[b.category]}</span>
                    <span className="text-xs text-gray-400">{b.property?.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{b.method === 'METER' ? '獨立電錶' : `${METHOD_LABEL[b.method]}分攤`}</span>
                  </div>
                  <span className="font-bold text-gray-800">NT${Number(b.totalAmount).toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  {new Date(b.periodStart).toLocaleDateString('zh-TW')} ~ {new Date(b.periodEnd).toLocaleDateString('zh-TW')}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                  {b.allocations.map((a) => (
                    <div key={a.id} className="bg-warm rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between">
                      <span className="text-gray-600">{a.unit.unitNumber}{b.method === 'METER' && a.basis != null ? `（${Number(a.basis)} 度）` : ''}</span>
                      <span className="font-medium text-gray-800">NT${Number(a.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                {b.allocations.every((a) => a.billed) ? (
                  <span className="text-xs text-green-600">已開帳通知租客</span>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditBill(b)} className="btn-secondary text-xs">編輯</button>
                    <button onClick={() => billToTenants(b.id)} className="btn-secondary text-xs flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" />LINE 開帳給租客
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddUtilityModal
          properties={properties}
          allUnits={allUnits}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchData(); }}
        />
      )}

      {showSplit && (
        <SplitModal
          properties={properties}
          onClose={() => setShowSplit(false)}
          onSaved={() => { setShowSplit(false); fetchData(); }}
        />
      )}

      {editBill && (
        <SplitModal
          properties={properties}
          editing={editBill}
          onClose={() => setEditBill(null)}
          onSaved={() => { setEditBill(null); fetchData(); }}
        />
      )}
    </div>
  );
}

function SplitModal({ properties, editing, onClose, onSaved }: {
  properties: Property[];
  editing?: UtilityBill | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(editing);
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const [form, setForm] = useState({
    propertyId: editing?.propertyId ?? properties[0]?.id ?? '',
    category: editing?.category ?? 'ELECTRICITY',
    periodStart: editing ? new Date(editing.periodStart).toISOString().split('T')[0] : firstDay,
    periodEnd: editing ? new Date(editing.periodEnd).toISOString().split('T')[0] : lastDay,
    totalAmount: editing ? String(editing.totalAmount) : '',
    method: editing?.method ?? 'METER',
  });
  const [usage, setUsage] = useState<Record<string, string>>({});
  // 獨立電錶（抄表）：每戶的 上期/本期/單價；編輯既有電錶帳單時回填已抄讀數
  const [meter, setMeter] = useState<Record<string, { prev: string; curr: string; price: string }>>(() => {
    if (editing?.method !== 'METER') return {};
    const m: Record<string, { prev: string; curr: string; price: string }> = {};
    for (const a of editing.allocations) {
      if (!a.unitId) continue;
      m[a.unitId] = {
        prev: a.prevReading != null ? String(a.prevReading) : '',
        curr: a.currReading != null ? String(a.currReading) : '',
        price: a.unitPrice != null ? String(a.unitPrice) : '',
      };
    }
    return m;
  });
  const [preview, setPreview] = useState<Allocation[] | null>(null);
  const [saving, setSaving] = useState(false);

  const property = properties.find((p) => p.id === form.propertyId);
  const occupiedUnits = (property?.units ?? []).filter((u) => u.status === 'OCCUPIED');
  const isMeter = form.method === 'METER';
  // 抄表模式只列出有獨立電錶的在住倉庫
  const meterUnits = occupiedUnits.filter((u) => u.hasElectricMeter);

  // 取某戶抄表欄位值（未填則帶倉庫預設：上期=目前度數、單價=預設單價）
  function meterVal(u: typeof occupiedUnits[number], key: 'prev' | 'curr' | 'price') {
    const m = meter[u.id];
    if (m && m[key] !== undefined && m[key] !== '') return m[key];
    if (key === 'prev') return u.electricLastReading != null ? String(u.electricLastReading) : '';
    if (key === 'price') return u.electricUnitPrice != null ? String(u.electricUnitPrice) : '';
    return '';
  }
  function setMeterVal(unitId: string, key: 'prev' | 'curr' | 'price', value: string) {
    setMeter((m) => {
      const existing = m[unitId] ?? { prev: '', curr: '', price: '' };
      return { ...m, [unitId]: { ...existing, [key]: value } };
    });
    setPreview(null);
  }

  function inputsPayload() {
    if (isMeter) {
      return meterUnits
        .filter((u) => meterVal(u, 'curr') !== '') // 只送有抄本期讀數的戶
        .map((u) => ({
          unitId: u.id,
          prevReading: Number(meterVal(u, 'prev') || 0),
          currReading: Number(meterVal(u, 'curr')),
          unitPrice: Number(meterVal(u, 'price') || 0),
        }));
    }
    return occupiedUnits.map((u) => ({ unitId: u.id, usage: Number(usage[u.id] ?? 0) }));
  }

  async function doPreview() {
    if (!isMeter && !form.totalAmount) return;
    const r = await api.post('/utility-bills/preview', {
      propertyId: form.propertyId,
      totalAmount: isMeter ? 0 : Number(form.totalAmount),
      method: form.method,
      inputs: inputsPayload(),
    });
    setPreview(r.data.allocations);
  }

  const previewTotal = (preview ?? []).reduce((s, a) => s + a.amount, 0);

  async function submit() {
    setSaving(true);
    try {
      const payload = { ...form, totalAmount: isMeter ? 0 : Number(form.totalAmount), inputs: inputsPayload() };
      if (isEdit) {
        await api.put(`/utility-bills/${editing!.id}`, payload);
      } else {
        await api.post('/utility-bills', payload);
      }
      onSaved();
    } catch (e: any) {
      alert(e.response?.data?.error ?? (isEdit ? '更新失敗' : '建立失敗'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Split className="w-5 h-5 text-brand" />{isEdit ? '編輯水電帳單' : '水電費帳單'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">據點</label>
              <select className="input" value={form.propertyId} onChange={(e) => { setForm({ ...form, propertyId: e.target.value }); setPreview(null); }}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">類別</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="ELECTRICITY">電費</option>
                <option value="WATER">水費</option>
                <option value="GAS">瓦斯費</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">期間起</label>
              <input type="date" className="input" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">期間迄</label>
              <input type="date" className="input" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">總金額</label>
              {isMeter ? (
                <input type="text" className="input bg-gray-50 text-gray-500" value={preview ? `NT$${previewTotal.toLocaleString()}` : '抄表後自動加總'} readOnly />
              ) : (
                <input type="number" className="input" value={form.totalAmount} onChange={(e) => { setForm({ ...form, totalAmount: e.target.value }); setPreview(null); }} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">計費方式</label>
              <select className="input" value={form.method} onChange={(e) => { setForm({ ...form, method: e.target.value }); setPreview(null); }}>
                <option value="METER">獨立電錶（抄表）</option>
                <option value="EVEN">平均分攤</option>
                <option value="AREA">依坪數</option>
                <option value="HEADCOUNT">依人頭</option>
                <option value="USAGE">依用量</option>
              </select>
            </div>
          </div>

          {isMeter && (
            <div>
              <label className="block text-sm font-medium mb-1">各倉抄表（僅列有獨立電錶的在住倉庫）</label>
              {meterUnits.length === 0 ? (
                <div className="text-xs text-gray-400 bg-warm rounded-lg p-2">此據點目前沒有「有獨立電錶」且在住的倉庫。請先到「倉儲管理」勾選倉庫的獨立電錶。</div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1.5 text-[11px] text-gray-400 px-1 mb-1">
                    <span>倉庫</span><span>上期</span><span>本期</span><span>單價</span>
                  </div>
                  <div className="space-y-1.5">
                    {meterUnits.map((u) => (
                      <div key={u.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1.5 items-center">
                        <span className="text-sm text-gray-600 truncate">{u.unitNumber}</span>
                        <input type="number" className="input text-sm py-1.5" placeholder="上期" value={meterVal(u, 'prev')} onChange={(e) => setMeterVal(u.id, 'prev', e.target.value)} />
                        <input type="number" className="input text-sm py-1.5" placeholder="本期" value={meterVal(u, 'curr')} onChange={(e) => setMeterVal(u.id, 'curr', e.target.value)} />
                        <input type="number" className="input text-sm py-1.5" placeholder="元/度" value={meterVal(u, 'price')} onChange={(e) => setMeterVal(u.id, 'price', e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">上期、單價會自動帶入倉庫設定值；沒填本期讀數的倉庫本期不收電費。</p>
                </>
              )}
            </div>
          )}

          {form.method === 'USAGE' && (
            <div>
              <label className="block text-sm font-medium mb-1">各房用量</label>
              <div className="space-y-1.5">
                {occupiedUnits.map((u) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-20">{u.unitNumber}</span>
                    <input type="number" className="input text-sm flex-1" placeholder="度數/用量" value={usage[u.id] ?? ''} onChange={(e) => { setUsage({ ...usage, [u.id]: e.target.value }); setPreview(null); }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={doPreview} className="btn-secondary text-sm w-full">{isMeter ? '試算電費' : '試算分攤'}</button>

          {preview && (
            <div className="bg-warm rounded-xl p-3">
              <div className="text-xs font-medium text-gray-600 mb-2">{isMeter ? `電費試算（${preview.length} 戶收費）` : `分攤結果（${occupiedUnits.length} 間在住）`}</div>
              {preview.length === 0 ? (
                <div className="text-xs text-gray-400">{isMeter ? '尚無填寫本期讀數的倉庫。' : '此據點目前無承租中倉庫。'}</div>
              ) : (
                <div className="space-y-1">
                  {preview.map((a) => (
                    <div key={a.unitId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{a.unitNumber}{isMeter ? `（${a.basis} 度）` : a.basis != null ? `（${a.basis}）` : ''}</span>
                      <span className="font-medium text-gray-800">NT${a.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {isMeter && (
                    <div className="flex items-center justify-between text-sm pt-1.5 mt-1 border-t border-gray-200">
                      <span className="text-gray-500 font-medium">合計</span>
                      <span className="font-bold text-gray-800">NT${previewTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button>
            <button type="button" onClick={submit} disabled={saving || (isMeter ? meterUnits.length === 0 : !form.totalAmount)} className="btn-primary flex-1 disabled:opacity-50">{saving ? '儲存中...' : isEdit ? '儲存變更' : isMeter ? '建立電費帳單' : '建立分攤帳單'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddUtilityModal({ properties, allUnits, onClose, onSaved }: {
  properties: Property[];
  allUnits: Array<{ id: string; unitNumber: string; propertyName: string; propertyId: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    category: 'ELECTRICITY',
    amount: '',
    date: now.toISOString().split('T')[0],
    description: '',
    propertyId: properties[0]?.id ?? '',
    unitId: '',
  });

  const unitsForProperty = allUnits.filter((u) => u.propertyId === form.propertyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/expenses', {
      category: form.category,
      amount: form.amount,
      date: form.date,
      description: form.description,
      propertyId: form.propertyId || undefined,
      unitId: form.unitId || undefined,
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <h3 className="font-bold text-lg mb-4">新增水電帳單</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              <option value="ELECTRICITY">電費</option>
              <option value="WATER">水費</option>
              <option value="GAS">瓦斯費</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">據點</label>
            <select
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value, unitId: '' })}
              className="input"
            >
              <option value="">不指定</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {form.propertyId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">倉庫（選填，公共區域可不填）</label>
              <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="input">
                <option value="">公共區域</option>
                {unitsForProperty.map((u) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">金額 <span className="text-red-400">*</span></label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" required placeholder="NT$" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期 <span className="text-red-400">*</span></label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">說明</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="例：5月份電費、共用區域水費..." />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button>
            <button type="submit" className="btn-primary flex-1">新增</button>
          </div>
        </form>
      </div>
    </div>
  );
}
