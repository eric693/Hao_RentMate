import { useEffect, useState } from 'react';
import { Plus, X, Trash2, Pencil, ShieldCheck } from 'lucide-react';
import api from '../api/client';

interface ModuleDef { key: string; label: string; }
interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
  permissions: string[];
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [modules, setModules] = useState<ModuleDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);

  async function load() {
    setLoading(true);
    const [u, m] = await Promise.all([api.get('/users'), api.get('/users/modules')]);
    setUsers(u.data);
    setModules(m.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(u: StaffUser) {
    if (!confirm(`確定刪除員工帳號「${u.name}」？此操作無法復原。`)) return;
    await api.delete(`/users/${u.id}`);
    load();
  }

  const moduleLabel = (key: string) => modules.find((m) => m.key === key)?.label ?? key;

  return (
    <div className="px-6 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">使用者管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">建立員工帳號並指派可存取的功能模組</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />新增使用者
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-12 text-gray-400 text-sm">
          尚未建立任何員工帳號
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand font-bold">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{u.name}
                      <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">員工</span>
                    </div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(u); setShowForm(true); }} className="p-2 text-gray-400 hover:text-brand hover:bg-gray-50 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(u)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />可存取：</span>
                {u.permissions.length === 0 ? (
                  <span className="text-xs text-gray-400">（無，僅能看總覽）</span>
                ) : (
                  u.permissions.map((p) => (
                    <span key={p} className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full">{moduleLabel(p)}</span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UserFormModal
          modules={modules}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function UserFormModal({ modules, editing, onClose, onSaved }: {
  modules: ModuleDef[];
  editing: StaffUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(editing);
  const [email, setEmail] = useState(editing?.email ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [password, setPassword] = useState('');
  const [perms, setPerms] = useState<string[]>(editing?.permissions ?? []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function toggle(key: string) {
    setPerms((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const body: any = { name, permissions: perms };
        if (password) body.password = password;
        await api.put(`/users/${editing!.id}`, body);
      } else {
        await api.post('/users', { email, name, password, permissions: perms });
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
          <h3 className="font-bold text-lg">{isEdit ? '編輯使用者' : '新增使用者'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email（帳號）<span className="text-red-400">*</span></label>
            <input type="email" className="input disabled:bg-gray-100 disabled:text-gray-400" value={email} disabled={isEdit}
              onChange={(e) => setEmail(e.target.value)} required placeholder="staff@example.com" />
            {isEdit && <p className="text-xs text-gray-400 mt-1">Email 建立後不可變更</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">姓名 <span className="text-red-400">*</span></label>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{isEdit ? '重設密碼（留空不變）' : '密碼'} {!isEdit && <span className="text-red-400">*</span>}</label>
            <input type="text" className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)}
              required={!isEdit} placeholder="至少 6 碼" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">模組權限</label>
            <div className="grid grid-cols-2 gap-2">
              {modules.map((m) => (
                <label key={m.key} className={`flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer text-sm ${
                  perms.includes(m.key) ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 text-gray-600'
                }`}>
                  <input type="checkbox" className="accent-brand" checked={perms.includes(m.key)} onChange={() => toggle(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">未勾選的功能該員工將看不到也無法操作（總覽一律可見）</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? '儲存中...' : isEdit ? '儲存變更' : '建立帳號'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
