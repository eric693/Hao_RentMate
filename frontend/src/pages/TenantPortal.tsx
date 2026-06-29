import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tenantApi from '../api/tenantClient';

type Tab = 'home' | 'contracts' | 'rent' | 'utility' | 'maintenance';

const fmtMoney = (v: any) => `NT$ ${Number(v).toLocaleString()}`;
const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('zh-TW') : '—');

const UTILITY_LABEL: Record<string, string> = { WATER: '水費', ELECTRICITY: '電費', GAS: '瓦斯費' };

const RENT_STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: '已繳清', cls: 'badge-paid' },
  PENDING: { label: '待繳', cls: 'badge-pending' },
  PARTIAL: { label: '部分繳款', cls: 'badge-pending' },
  OVERDUE: { label: '逾期', cls: 'badge-overdue' },
};

function StatusBadge({ status }: { status: string }) {
  const s = RENT_STATUS[status] ?? { label: status, cls: 'badge-pending' };
  return <span className={s.cls}>{s.label}</span>;
}

export default function TenantPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('home');
  const [me, setMe] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [rent, setRent] = useState<any[]>([]);
  const [utility, setUtility] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 報修表單
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mPhotos, setMPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.slice(0, 6 - mPhotos.length).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => setMPhotos((p) => [...p, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  async function loadAll() {
    try {
      const [meRes, payRes, conRes, rentRes, utilRes, mRes] = await Promise.all([
        tenantApi.get('/tenant/me'),
        tenantApi.get('/tenant/payment-info'),
        tenantApi.get('/tenant/contracts'),
        tenantApi.get('/tenant/rent-records'),
        tenantApi.get('/tenant/utility-bills'),
        tenantApi.get('/tenant/maintenance'),
      ]);
      setMe(meRes.data);
      setPayment(payRes.data);
      setContracts(conRes.data);
      setRent(rentRes.data);
      setUtility(utilRes.data);
      setMaint(mRes.data);
    } catch (err: any) {
      setError('資料載入失敗，請重新登入');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('tenantToken')) {
      navigate('/tenant/login');
      return;
    }
    loadAll();
  }, []);

  function logout() {
    localStorage.removeItem('tenantToken');
    navigate('/tenant/login');
  }

  async function submitMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!mTitle.trim() || !mDesc.trim()) return;
    setSubmitting(true);
    try {
      await tenantApi.post('/tenant/maintenance', { title: mTitle.trim(), description: mDesc.trim(), photos: mPhotos });
      setMTitle('');
      setMDesc('');
      setMPhotos([]);
      const mRes = await tenantApi.get('/tenant/maintenance');
      setMaint(mRes.data);
      setTab('maintenance');
    } catch (err: any) {
      alert(err?.response?.data?.error ?? '報修送出失敗');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">載入中...</div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 text-gray-500">
      <p>{error}</p>
      <button onClick={logout} className="btn-primary">回登入頁</button>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: '首頁' },
    { key: 'contracts', label: '租約' },
    { key: 'rent', label: '繳費' },
    { key: 'utility', label: '水電' },
    { key: 'maintenance', label: '報修' },
  ];

  return (
    <div className="min-h-screen bg-warm pb-24">
      {/* 頂部 */}
      <header className="bg-brand text-white px-4 py-4 shadow">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">租客專區</p>
            <h1 className="text-lg font-bold">{me?.name} 您好</h1>
          </div>
          <button onClick={logout} className="text-sm bg-white/20 rounded-lg px-3 py-1.5 hover:bg-white/30">
            登出
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* ── 首頁 ── */}
        {tab === 'home' && (
          <>
            <div className="card">
              <h2 className="font-bold text-gray-800 mb-3">我的資料</h2>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">姓名</dt><dd className="text-gray-800">{me?.name}</dd>
                <dt className="text-gray-500">電話</dt><dd className="text-gray-800">{me?.phone || '—'}</dd>
                <dt className="text-gray-500">Email</dt><dd className="text-gray-800">{me?.email || '—'}</dd>
                <dt className="text-gray-500">房東</dt><dd className="text-gray-800">{me?.landlordName}</dd>
              </dl>
            </div>

            {payment?.contract && (
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-3">付款資訊</h2>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">承租倉庫</span>
                    <span className="text-gray-800">{payment.contract.propertyName} {payment.contract.unitNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">月租</span>
                    <span className="text-gray-800">{fmtMoney(payment.contract.monthlyRent)}</span>
                  </div>
                  {payment.virtualAccount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">繳費帳號</span>
                      <span className="text-gray-800 font-mono">
                        ({payment.virtualAccount.bankCode}) {payment.virtualAccount.accountNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t mt-2">
                    <span className="text-gray-500">尚未結清</span>
                    <span className={`font-bold ${payment.totalDue > 0 ? 'text-red-500' : 'text-brand'}`}>
                      {fmtMoney(payment.totalDue)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setTab('maintenance')} className="btn-primary w-full py-3">
              我要報修
            </button>
          </>
        )}

        {/* ── 租約 ── */}
        {tab === 'contracts' && (
          <div className="space-y-3">
            {contracts.length === 0 && <p className="text-gray-400 text-center py-8">目前沒有租約</p>}
            {contracts.map((c) => (
              <div key={c.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800">
                    {c.unit?.property?.name} {c.unit?.unitNumber}
                  </h3>
                  <span className={c.status === 'ACTIVE' ? 'badge-paid' : 'badge-pending'}>
                    {c.status === 'ACTIVE' ? '生效中' : c.status}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <dt className="text-gray-500">租期</dt>
                  <dd className="text-gray-800">{fmtDate(c.startDate)} ~ {fmtDate(c.endDate)}</dd>
                  <dt className="text-gray-500">月租</dt><dd className="text-gray-800">{fmtMoney(c.monthlyRent)}</dd>
                  <dt className="text-gray-500">押金</dt><dd className="text-gray-800">{fmtMoney(c.depositAmount)}</dd>
                  <dt className="text-gray-500">每月繳款日</dt><dd className="text-gray-800">{c.rentDueDay} 號</dd>
                </dl>

                {/* 簽約狀態 */}
                <div className="mt-3 pt-3 border-t">
                  {c.signedAt ? (
                    <p className="text-sm text-brand flex items-center gap-1">
                      ✓ 已於 {fmtDate(c.signedAt)} 完成電子簽署
                      {c.signerName && <span className="text-gray-400">（{c.signerName}）</span>}
                    </p>
                  ) : c.signToken ? (
                    <a
                      href={`/sign/${c.signToken}`}
                      className="btn-primary inline-block w-full text-center py-2.5"
                    >
                      前往線上簽約
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">尚未開放簽署，請待房東發出簽署邀請</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 繳費紀錄 ── */}
        {tab === 'rent' && (
          <div className="space-y-3">
            {rent.length === 0 && <p className="text-gray-400 text-center py-8">尚無繳費紀錄</p>}
            {rent.map((r) => (
              <div key={r.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{r.year} 年 {r.month} 月</p>
                  <p className="text-xs text-gray-500 mt-0.5">應繳 {fmtMoney(r.amount)}
                    {Number(r.paidAmount) > 0 && ` ・ 已繳 ${fmtMoney(r.paidAmount)}`}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}

        {/* ── 水電費 ── */}
        {tab === 'utility' && (
          <div className="space-y-3">
            {utility.length === 0 && <p className="text-gray-400 text-center py-8">尚無水電帳單</p>}
            {utility.map((u) => (
              <div key={u.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">
                      {UTILITY_LABEL[u.category] ?? '水電費'}
                      <span className="text-xs text-gray-400 ml-2">{u.propertyName} {u.unitNumber}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmtDate(u.periodStart)} ~ {fmtDate(u.periodEnd)}</p>
                  </div>
                  <p className="font-bold text-gray-800">{fmtMoney(u.amount)}</p>
                </div>
                {u.method === 'METER' && u.currReading != null && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    抄表：{u.prevReading} → {u.currReading} ・ 本期用電 <span className="font-medium text-gray-700">{u.basis} 度</span>
                    {u.unitPrice != null && <> ・ 單價 NT$ {u.unitPrice}/度</>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 報修 ── */}
        {tab === 'maintenance' && (
          <div className="space-y-4">
            <form onSubmit={submitMaintenance} className="card space-y-3">
              <h2 className="font-bold text-gray-800">新增報修</h2>
              <input
                className="input"
                placeholder="標題（例如：浴室漏水）"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                required
              />
              <textarea
                className="input min-h-[90px]"
                placeholder="詳細說明問題狀況"
                value={mDesc}
                onChange={(e) => setMDesc(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">照片（選填，最多 6 張）</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotos}
                  disabled={mPhotos.length >= 6}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand file:text-white file:text-xs file:font-medium hover:file:bg-brand-dark"
                />
                {mPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {mPhotos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} alt={`照片${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setMPhotos((arr) => arr.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
                {submitting ? '送出中...' : '送出報修'}
              </button>
            </form>

            <div className="space-y-3">
              <h2 className="font-bold text-gray-800">報修紀錄</h2>
              {maint.length === 0 && <p className="text-gray-400 text-center py-6">尚無報修紀錄</p>}
              {maint.map((m) => (
                <div key={m.id} className="card">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800">{m.title}</h3>
                    <span className="badge-pending">{m.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{m.description}</p>
                  {Array.isArray(m.photos) && m.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {m.photos.map((src: string, i: number) => (
                        <a key={i} href={src} target="_blank" rel="noreferrer">
                          <img src={src} alt={`報修照片${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {m.category} ・ 優先級 {m.priority} ・ {fmtDate(m.reportedAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 底部分頁 */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'text-brand' : 'text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
