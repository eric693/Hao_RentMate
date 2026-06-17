import { useEffect, useState } from 'react';
import { X, Plus, Search, AlertTriangle, Calendar, User, Home, FileSignature, CheckCircle2, Send, Copy, Check, Wallet, ShieldCheck, ClipboardCheck } from 'lucide-react';
import api from '../api/client';
import { Contract, Property, Tenant, Unit } from '../types';
import DepositRefundModal from '../components/DepositRefundModal';
import ComplianceModal from '../components/ComplianceModal';
import HandoverModal from '../components/HandoverModal';

type FilterType = 'all' | 'active' | 'expiring' | 'expired' | 'terminated';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filter, setFilter] = useState<FilterType>('active');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signResult, setSignResult] = useState<{ contractId: string; signUrl: string; sent: boolean } | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [depositModal, setDepositModal] = useState<Contract | null>(null);
  const [complianceModal, setComplianceModal] = useState<Contract | null>(null);
  const [handoverModal, setHandoverModal] = useState<Contract | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [c, p, t] = await Promise.all([
      api.get('/contracts'),
      api.get('/properties'),
      api.get('/tenants'),
    ]);
    setContracts(c.data);
    setProperties(p.data);
    setTenants(t.data);
    setLoading(false);
  }

  async function terminate(id: string) {
    if (!confirm('確定要終止此合約？此操作無法復原。')) return;
    await api.put(`/contracts/${id}`, { status: 'TERMINATED' });
    fetchAll();
  }

  async function sendSignInvite(id: string) {
    setSigningId(id);
    try {
      const r = await api.post(`/contracts/${id}/sign-invite`);
      setSignResult({ contractId: id, signUrl: r.data.signUrl, sent: r.data.sent });
    } catch (e: any) {
      alert(e.response?.data?.error ?? '發送失敗');
    } finally {
      setSigningId(null);
    }
  }

  function copySignUrl(url: string) {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function viewIdDocument(id: string) {
    try {
      const res = await api.get(`/contracts/${id}/id-document`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert('無法載入證件');
    }
  }

  const now = Date.now();
  const thirtyDays = 30 * 86400000;

  const filtered = contracts
    .filter((c) => {
      const end = new Date(c.endDate).getTime();
      const daysLeft = (end - now) / 86400000;
      if (filter === 'active') return c.status === 'ACTIVE';
      if (filter === 'expiring') return c.status === 'ACTIVE' && daysLeft <= 30 && daysLeft > 0;
      if (filter === 'expired') return c.status === 'EXPIRED';
      if (filter === 'terminated') return c.status === 'TERMINATED';
      return true;
    })
    .filter((c) => {
      if (!search) return true;
      const tenantName = c.tenant?.name ?? '';
      const unit = c.unit?.unitNumber ?? '';
      return tenantName.includes(search) || unit.includes(search);
    });

  const counts = {
    all: contracts.length,
    active: contracts.filter((c) => c.status === 'ACTIVE').length,
    expiring: contracts.filter((c) => {
      const d = (new Date(c.endDate).getTime() - now) / 86400000;
      return c.status === 'ACTIVE' && d <= 30 && d > 0;
    }).length,
    expired: contracts.filter((c) => c.status === 'EXPIRED').length,
    terminated: contracts.filter((c) => c.status === 'TERMINATED').length,
  };

  const statusLabel = (s: string) => ({ ACTIVE: '進行中', EXPIRED: '已到期', TERMINATED: '已終止' }[s] ?? s);
  const statusClass = (s: string) => ({
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-orange-100 text-orange-600',
    TERMINATED: 'bg-gray-100 text-gray-500',
  }[s] ?? 'bg-gray-100 text-gray-500');

  const allUnits = properties.flatMap((p) => p.units.map((u) => ({ ...u, propertyName: p.name })));

  return (
    <div className="px-6 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">合約管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">共 {contracts.length} 份合約，{counts.active} 份進行中</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />新增合約
        </button>
      </div>

      {/* Expiring alerts */}
      {counts.expiring > 0 && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-sm text-orange-700">有 <strong>{counts.expiring}</strong> 份合約將在 30 天內到期，請及時處理續租或到期事宜。</span>
          <button onClick={() => setFilter('expiring')} className="ml-auto text-xs text-orange-600 underline whitespace-nowrap">查看</button>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {([
            { key: 'all', label: '全部' },
            { key: 'active', label: '進行中' },
            { key: 'expiring', label: '即將到期' },
            { key: 'expired', label: '已到期' },
            { key: 'terminated', label: '已終止' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${filter === f.key ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f.label} ({counts[f.key]})
              {f.key === 'expiring' && counts.expiring > 0 && filter !== 'expiring' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="搜尋租客姓名或房號"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl pl-8 pr-3 py-2 outline-none focus:border-brand bg-white"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-12 text-gray-400 text-sm">
          {search ? `找不到「${search}」的相關合約` : '暫無符合條件的合約'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const end = new Date(c.endDate).getTime();
            const daysLeft = Math.ceil((end - now) / 86400000);
            const isExpiringSoon = c.status === 'ACTIVE' && daysLeft <= 30 && daysLeft > 0;

            return (
              <div key={c.id} className={`bg-white rounded-2xl border p-4 ${isExpiringSoon ? 'border-orange-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-warm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Home className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{c.unit?.unitNumber}</span>
                        <span className="text-xs text-gray-400">{c.unit?.property?.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(c.status)}`}>
                          {statusLabel(c.status)}
                        </span>
                        {isExpiringSoon && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />{daysLeft} 天後到期
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <User className="w-3 h-3" />{c.tenant?.name} · {c.tenant?.phone}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">NT${Number(c.monthlyRent).toLocaleString()}</div>
                    <div className="text-xs text-gray-400">/月</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-warm rounded-xl p-3 mb-3 text-xs text-center">
                  <div>
                    <div className="text-gray-400 mb-0.5">開始日期</div>
                    <div className="font-medium text-gray-700">{new Date(c.startDate).toLocaleDateString('zh-TW')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-0.5">結束日期</div>
                    <div className={`font-medium ${isExpiringSoon ? 'text-orange-600' : 'text-gray-700'}`}>
                      {new Date(c.endDate).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-0.5">押金</div>
                    <div className="font-medium text-gray-700">NT${Number(c.depositAmount).toLocaleString()}</div>
                  </div>
                </div>

                {c.notes && (
                  <p className="text-xs text-gray-400 mb-3">備註：{c.notes}</p>
                )}

                {/* Sign status */}
                {c.signedAt ? (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-2.5 py-1.5 w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      已電子簽署 · {new Date(c.signedAt).toLocaleDateString('zh-TW')}
                    </div>
                    {c.signerIdDocument && (
                      <button onClick={() => viewIdDocument(c.id)}
                        className="text-xs text-brand border border-brand/30 rounded-lg px-2.5 py-1.5 hover:bg-brand/5 transition-colors">
                        查看證件
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 rounded-lg px-2.5 py-1.5 mb-2 w-fit">
                    <FileSignature className="w-3.5 h-3.5" />
                    尚未簽署
                  </div>
                )}

                {/* Deposit refund status badge */}
                {c.depositRefund && (
                  <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 mb-2 w-fit ${
                    c.depositRefund.status === 'COMPLETED'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    <Wallet className="w-3.5 h-3.5" />
                    {c.depositRefund.status === 'COMPLETED'
                      ? `押金已退 NT$${Number(c.depositRefund.refundAmount).toLocaleString()}`
                      : `退押進行中・應退 NT$${Number(c.depositRefund.refundAmount).toLocaleString()}`}
                  </div>
                )}

                {c.status === 'ACTIVE' && (
                  <div className="flex gap-2 flex-wrap">
                    {!c.signedAt ? (
                      <button
                        onClick={() => setEditContract(c)}
                        className="text-xs px-3 py-1.5 border border-brand/30 rounded-lg text-brand hover:bg-brand/5 transition-colors flex items-center gap-1"
                      >
                        <FileSignature className="w-3 h-3" />編輯
                      </button>
                    ) : (
                      <span className="text-xs px-3 py-1.5 text-gray-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />已簽署鎖定
                      </span>
                    )}
                    {!c.signedAt && (
                      <button
                        onClick={() => sendSignInvite(c.id)}
                        disabled={signingId === c.id}
                        className="text-xs px-3 py-1.5 border border-brand/30 rounded-lg text-brand hover:bg-brand/5 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        {signingId === c.id ? '發送中...' : '邀請簽署'}
                      </button>
                    )}
                    <button
                      onClick={() => setHandoverModal(c)}
                      className="text-xs px-3 py-1.5 border border-brand/30 rounded-lg text-brand hover:bg-brand/5 transition-colors flex items-center gap-1"
                    >
                      <ClipboardCheck className="w-3 h-3" />點交
                    </button>
                    <button
                      onClick={() => setComplianceModal(c)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" />合規檢查
                    </button>
                    <button
                      onClick={() => setDepositModal(c)}
                      className="text-xs px-3 py-1.5 border border-orange-200 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-1"
                    >
                      <Wallet className="w-3 h-3" />辦理退押
                    </button>
                    <button
                      onClick={() => terminate(c.id)}
                      className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                    >
                      終止合約
                    </button>
                    <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                      <Calendar className="w-3 h-3" />
                      每月 {c.rentDueDay} 日繳租
                    </div>
                  </div>
                )}

                {/* Terminated/Expired: show deposit button */}
                {(c.status === 'TERMINATED' || c.status === 'EXPIRED') && c.depositPaid && (
                  <button
                    onClick={() => setDepositModal(c)}
                    className="text-xs px-3 py-1.5 border border-orange-200 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-1 w-fit mt-1"
                  >
                    <Wallet className="w-3 h-3" />
                    {c.depositRefund ? '查看退押明細' : '辦理退押'}
                  </button>
                )}

                {/* Sign link result */}
                {signResult?.contractId === c.id && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <div className="text-xs text-blue-700 font-medium mb-2">
                      {signResult.sent ? '✅ 已透過 LINE 發送簽署連結給租客' : '⚠️ 租客尚未綁定 LINE，請複製連結手動發送'}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={signResult.signUrl}
                        className="flex-1 text-xs bg-white border border-blue-100 rounded-lg px-2 py-1 text-blue-800 truncate"
                      />
                      <button onClick={() => copySignUrl(signResult.signUrl)} className="p-1.5 bg-white border border-blue-100 rounded-lg hover:border-blue-300 transition-colors">
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                      </button>
                    </div>
                    <button onClick={() => setSignResult(null)} className="text-xs text-blue-400 mt-1.5 hover:text-blue-600">關閉</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddContractModal
          units={allUnits}
          tenants={tenants}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchAll(); }}
        />
      )}

      {editContract && (
        <AddContractModal
          units={allUnits}
          tenants={tenants}
          editing={editContract}
          onClose={() => setEditContract(null)}
          onSaved={() => { setEditContract(null); fetchAll(); }}
        />
      )}

      {depositModal && (
        <DepositRefundModal
          contract={depositModal}
          onClose={() => setDepositModal(null)}
          onSaved={() => { fetchAll(); }}
        />
      )}

      {complianceModal && (
        <ComplianceModal contract={complianceModal} onClose={() => setComplianceModal(null)} />
      )}

      {handoverModal && (
        <HandoverModal contract={handoverModal} onClose={() => setHandoverModal(null)} />
      )}
    </div>
  );
}

function AddContractModal({ units, tenants, editing, onClose, onSaved }: {
  units: Array<Unit & { propertyName: string }>;
  tenants: Tenant[];
  editing?: Contract | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(editing);
  const [form, setForm] = useState({
    unitId: editing?.unitId ?? '',
    tenantId: editing?.tenantId ?? '',
    startDate: editing ? new Date(editing.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: editing ? new Date(editing.endDate).toISOString().split('T')[0] : '',
    monthlyRent: editing ? String(editing.monthlyRent) : '',
    depositAmount: editing ? String(editing.depositAmount) : '',
    rentDueDay: editing ? String(editing.rentDueDay) : '5',
    notes: editing?.notes ?? '',
    customTerms: editing?.customTerms ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/contracts/${editing!.id}`, form);
      } else {
        await api.post('/contracts', form);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{isEdit ? '編輯合約' : '新增合約'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">房間 <span className="text-red-400">*</span></label>
            <select
              className="input disabled:bg-gray-100 disabled:text-gray-400"
              value={form.unitId}
              disabled={isEdit}
              onChange={(e) => {
                const u = units.find((u) => u.id === e.target.value);
                setForm({ ...form, unitId: e.target.value, monthlyRent: u ? String(u.monthlyRent) : form.monthlyRent });
              }}
              required
            >
              <option value="">請選擇房間</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.propertyName} — {u.unitNumber} (NT${Number(u.monthlyRent).toLocaleString()})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">租客 <span className="text-red-400">*</span></label>
            <select className="input disabled:bg-gray-100 disabled:text-gray-400" value={form.tenantId} disabled={isEdit} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} required>
              <option value="">請選擇租客</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.phone}</option>)}
            </select>
          </div>
          {isEdit && <p className="text-xs text-gray-400 -mt-1">房間與租客建立後不可變更</p>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">開始日期 <span className="text-red-400">*</span></label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">結束日期 <span className="text-red-400">*</span></label>
              <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">月租金 <span className="text-red-400">*</span></label>
              <input type="number" className="input" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">押金</label>
              <input type="number" className="input" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">每月繳租日</label>
            <input type="number" min="1" max="28" className="input" value={form.rentDueDay} onChange={(e) => setForm({ ...form, rentDueDay: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">備註</label>
            <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="選填" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">自訂租賃條款</label>
            <textarea className="input" value={form.customTerms} onChange={(e) => setForm({ ...form, customTerms: e.target.value })} rows={4} placeholder="每行一條，留空則簽約頁顯示系統預設條款" />
            <p className="text-xs text-gray-400 mt-1">填寫後，租客簽約頁將顯示此處的條款（取代預設條款）</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? '儲存中...' : isEdit ? '儲存變更' : '新增合約'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
