import { useEffect, useState } from 'react';
import { Bell, MessageCircle, Users, UserPlus, Shield, X, Copy, Check, ChevronRight, RefreshCw, Send, Zap } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

type SettingsTab = 'account' | 'team' | 'notifications';

interface LandlordBinding {
  lineUserId: string | null;
  displayName?: string;
  boundAt?: string;
  bindingCode?: string;
  bindingCodeExpiry?: string;
}

interface TenantBinding {
  id: string;
  name: string;
  phone: string;
  lineUserId: string | null;
  lineDisplayName: string | null;
  lineBoundAt: string | null;
  lineBindingCode: string | null;
  lineBindingCodeExpiry: string | null;
  contracts?: Array<{ unit: { unitNumber: string } }>;
}

const TAB_ITEMS: Array<{ key: SettingsTab; label: string; icon: React.ReactNode }> = [
  { key: 'account', label: '帳號設定', icon: <Bell className="w-4 h-4" /> },
  { key: 'team', label: '團隊成員', icon: <Users className="w-4 h-4" /> },
  { key: 'notifications', label: '通知設定', icon: <Shield className="w-4 h-4" /> },
];

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('account');
  const [landlordBinding, setLandlordBinding] = useState<LandlordBinding>({ lineUserId: null });
  const [tenantBindings, setTenantBindings] = useState<TenantBinding[]>([]);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expiry: string } | null>(null);
  const [tenantCodes, setTenantCodes] = useState<Record<string, { code: string; expiry: string }>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [b, t] = await Promise.all([
      api.get('/line/binding'),
      api.get('/line/tenants'),
    ]);
    setLandlordBinding(b.data);
    setTenantBindings(t.data);
    setLoading(false);
  }

  async function generateLandlordCode() {
    const res = await api.post('/line/binding/generate');
    setGeneratedCode({ code: res.data.code, expiry: res.data.expiry });
    fetchAll();
  }

  async function unbindLandlord() {
    if (!confirm('確定要解除 LINE 綁定？')) return;
    await api.delete('/line/binding');
    fetchAll();
  }

  async function generateTenantCode(tenantId: string) {
    const res = await api.post(`/tenants/${tenantId}/line-code`);
    setTenantCodes(prev => ({ ...prev, [tenantId]: { code: res.data.code, expiry: res.data.expiry } }));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isLandlordBound = landlordBinding.lineUserId && !landlordBinding.lineUserId.startsWith('pending_');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">設定</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100">
        {TAB_ITEMS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: 帳號設定 */}
      {tab === 'account' && (
        <div className="space-y-4">
          {/* Account Info */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">帳號資訊</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span className="text-gray-500">姓名</span>
                <span className="font-medium text-gray-800">{user?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-800">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Landlord LINE Binding */}
          <div className="card">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-700">房東 LINE 綁定</h2>
                <p className="text-xs text-gray-400 mt-0.5">綁定後，付款提醒、合約到期提醒與系統通知都會直接送到 LINE</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4 text-gray-400 text-sm">載入中...</div>
            ) : isLandlordBound ? (
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium text-sm">已完成綁定</span>
                </div>
                {landlordBinding.displayName && (
                  <p className="text-sm text-gray-600">LINE 名稱：{landlordBinding.displayName}</p>
                )}
                {landlordBinding.boundAt && (
                  <p className="text-xs text-gray-400 mt-0.5">綁定時間：{new Date(landlordBinding.boundAt).toLocaleString('zh-TW')}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={generateLandlordCode} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />重新產生綁定碼
                  </button>
                  <button onClick={unbindLandlord} className="btn-danger text-xs px-3 py-1.5">解除綁定</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">尚未綁定 LINE，點擊下方按鈕產生綁定碼</p>
                <button onClick={generateLandlordCode} className="btn-primary text-sm w-full">產生綁定碼</button>
              </div>
            )}

            {generatedCode && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-yellow-800 mb-1">您的綁定碼</p>
                <div className="flex items-center justify-center gap-3 my-3">
                  <div className="text-3xl font-bold tracking-widest text-brand font-mono">{generatedCode.code}</div>
                  <button onClick={() => copyCode(generatedCode.code)} className="p-1.5 rounded-lg bg-white border border-yellow-200 hover:border-brand transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
                <p className="text-xs text-yellow-700 text-center">請將此綁定碼傳送至 LINE Bot</p>
                <p className="text-xs text-gray-400 text-center mt-1">
                  有效期限：{new Date(generatedCode.expiry).toLocaleString('zh-TW')}
                </p>
                <LineInstructions />
              </div>
            )}
          </div>

          {/* Tenant LINE Bindings */}
          <div className="card">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-700">租客 LINE 綁定</h2>
                <p className="text-xs text-gray-400 mt-0.5">租客先加入 LINE Bot 並輸入邀請碼後，系統會自動配對</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4 text-gray-400 text-sm">載入中...</div>
            ) : tenantBindings.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">尚無租客</div>
            ) : (
              <div className="space-y-3">
                {tenantBindings.map((t) => {
                  const unitNumber = t.contracts?.[0]?.unit?.unitNumber;
                  const code = tenantCodes[t.id];
                  return (
                    <div key={t.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{t.name}</span>
                            {unitNumber && <span className="text-xs text-gray-400">{unitNumber}</span>}
                            {t.lineUserId ? (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Check className="w-3 h-3" />已綁定
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">尚未綁定</span>
                            )}
                          </div>
                          {t.lineDisplayName && <p className="text-xs text-gray-400 mt-0.5">LINE：{t.lineDisplayName}</p>}
                        </div>
                        {!t.lineUserId && (
                          <button onClick={() => generateTenantCode(t.id)} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                            <UserPlus className="w-3 h-3" />產生邀請碼
                          </button>
                        )}
                      </div>
                      {code && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-2 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-blue-700">邀請碼：<span className="font-bold font-mono text-base tracking-widest">{code.code}</span></p>
                            <p className="text-xs text-gray-400">有效至 {new Date(code.expiry).toLocaleString('zh-TW')}</p>
                          </div>
                          <button onClick={() => copyCode(code.code)} className="p-1 rounded bg-white border border-blue-100">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: 團隊成員 */}
      {tab === 'team' && (
        <TeamMembersTab user={user} tenantCount={tenantBindings.length} />
      )}

      {/* Tab: 通知設定 */}
      {tab === 'notifications' && (
        <NotificationsTab />
      )}
    </div>
  );
}

function TeamMembersTab({ user, tenantCount }: { user: any; tenantCount: number }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('管理員');
  const [members] = useState([
    { id: '1', name: user?.name ?? '擁有者', email: user?.email ?? '', role: '擁有者', isOwner: true, isYou: true },
  ]);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    alert(`邀請功能需要後端支援。\n已填寫：${inviteEmail} (${inviteRole})`);
    setInviteEmail('');
  }

  return (
    <div className="space-y-4">
      {/* Current workspace */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />目前工作區
          </span>
          <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">擁有者</span>
        </div>
        <div className="font-semibold text-gray-800 mb-2">{user?.name}</div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{user?.name?.charAt(0)}</span>
          </div>
          <span className="text-xs text-gray-400">擁有者登入中</span>
        </div>
      </div>

      {/* Team status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand" />
            <span className="font-semibold text-gray-700">團隊狀態</span>
          </div>
          <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full">可管理</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">成員、邀請與權限一眼確認</p>
        <div className="grid grid-cols-4 divide-x divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {[
            { label: '成員', value: members.length },
            { label: '邀請', value: 0 },
            { label: '角色', value: '擁有者' },
            { label: '權限', value: '管理' },
          ].map((item) => (
            <div key={item.label} className="text-center py-3 px-2">
              <div className="text-xs text-gray-400 mb-1">{item.label}</div>
              <div className="font-bold text-gray-800 text-sm">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite member */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <UserPlus className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-700">邀請成員</span>
            </div>
            <p className="text-xs text-gray-400">建立邀請後，對方接受才會加入。</p>
          </div>
          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />同步
          </button>
        </div>
        <form onSubmit={handleInvite} className="space-y-3">
          <input
            type="email"
            placeholder="成員 Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="input text-sm"
            required
          />
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="input text-sm flex-1"
            >
              <option value="管理員">管理員</option>
              <option value="財務">財務</option>
              <option value="維修人員">維修人員</option>
            </select>
            <p className="text-xs text-gray-400 self-center whitespace-nowrap">
              {inviteRole === '管理員' ? '倉庫、租客、租金、報修與 LINE 基本管理。' : inviteRole === '財務' ? '帳務相關功能。' : '報修管理。'}
            </p>
          </div>
          <button type="submit" className="btn-primary text-sm w-full flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />邀請
          </button>
        </form>
      </div>

      {/* Member list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-700">成員清單</span>
            </div>
            <p className="text-xs text-gray-400">{members.length} 位成員可進入此工作台。</p>
          </div>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-warm transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{m.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    {m.isOwner && <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">擁有者</span>}
                    {m.isYou && <span className="text-xs text-gray-400">你</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.email}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    enabled: true,
    daysBefore: 3,
    remindOnDue: true,
    overdueEnabled: true,
    overdueInterval: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.get('/settings/reminder').then((r) => setSettings(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function saveSettings() {
    setSaving(true);
    try {
      await api.put('/settings/reminder', settings);
      showToast('設定已儲存');
    } catch { showToast('儲存失敗，請稍後再試'); }
    setSaving(false);
  }

  async function triggerNow() {
    setTriggering(true);
    try {
      const r = await api.post('/settings/reminder/trigger');
      showToast(r.data.message);
    } catch { showToast('發送失敗，請稍後再試'); }
    setTriggering(false);
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${value ? 'bg-brand' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      {/* Smart reminder config */}
      <div className="card">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-brand" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">智慧催繳設定</h2>
              <Toggle value={settings.enabled} onChange={(v) => setSettings(s => ({ ...s, enabled: v }))} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">每日 09:00 自動掃描，依設定傳 LINE 提醒給租客</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-400 text-sm">載入中...</div>
        ) : (
          <div className={`space-y-4 ${!settings.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* Before due */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">到期前提醒</div>
                  <div className="text-xs text-gray-400">租金到期前幾天傳提醒給租客</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">到期前</span>
                <select
                  value={settings.daysBefore}
                  onChange={(e) => setSettings(s => ({ ...s, daysBefore: Number(e.target.value) }))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
                >
                  {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                    <option key={d} value={d}>{d} 天</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">發送提醒</span>
              </div>
            </div>

            {/* On due */}
            <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">當天到期提醒</div>
                <div className="text-xs text-gray-400">到期當天再發一次催繳通知</div>
              </div>
              <Toggle value={settings.remindOnDue} onChange={(v) => setSettings(s => ({ ...s, remindOnDue: v }))} />
            </div>

            {/* Overdue */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">逾期催繳</div>
                  <div className="text-xs text-gray-400">逾期後持續發送催繳提醒</div>
                </div>
                <Toggle value={settings.overdueEnabled} onChange={(v) => setSettings(s => ({ ...s, overdueEnabled: v }))} />
              </div>
              {settings.overdueEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">逾期後每</span>
                  <select
                    value={settings.overdueInterval}
                    onChange={(e) => setSettings(s => ({ ...s, overdueInterval: Number(e.target.value) }))}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
                  >
                    {[1, 2, 3, 5, 7].map((d) => (
                      <option key={d} value={d}>{d} 天</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500">重送一次（逾期第1天必發）</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={triggerNow}
                disabled={triggering}
                className="flex items-center gap-1.5 px-4 py-2 border border-brand text-brand rounded-xl text-sm font-medium hover:bg-brand/5 transition-colors disabled:opacity-50"
              >
                {triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                立即發送提醒
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex-1 btn-primary text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                儲存設定
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Other notification toggles */}
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">其他通知</h2>
            <p className="text-xs text-gray-400 mt-0.5">以下為固定排程通知（不受智慧催繳設定影響）</p>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { label: '合約到期提醒', desc: '合約到期前 30、14、7 天提醒房東與租客' },
            { label: '逾期彙整通知', desc: '每日9時將逾期倉庫彙整後通知房東 LINE' },
          ].map((item) => (
            <div key={item.label} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 mr-4">
                <div className="text-sm font-medium text-gray-700">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </div>
              <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium self-center">固定啟用</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-brand/5 border-brand/20">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-4 h-4 text-brand" />
          <span className="text-sm font-semibold text-brand">LINE Bot 使用說明</span>
        </div>
        <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
          <li>開啟 LINE，搜尋並加入 <strong>RentMate Bot</strong></li>
          <li>在聊天室輸入您在「帳號設定」中產生的 8 位綁定碼</li>
          <li>收到確認訊息後即完成綁定，自動通知即時生效</li>
        </ol>
      </div>
    </div>
  );
}

function LineInstructions() {
  return (
    <div className="mt-3 border-t border-yellow-200 pt-3">
      <p className="text-xs font-medium text-yellow-800 mb-1">使用步驟：</p>
      <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
        <li>開啟 LINE，搜尋並加入 RentMate Bot</li>
        <li>在聊天室輸入上方的 8 位綁定碼</li>
        <li>收到確認訊息後即完成綁定</li>
      </ol>
    </div>
  );
}
