import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tenantApi from '../api/tenantClient';

export default function TenantLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await tenantApi.post('/tenant/auth/login', { bindingCode: code.trim() });
      localStorage.setItem('tenantToken', res.data.token);
      navigate('/tenant');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? '登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">租客專區</h1>
          <p className="text-gray-500 text-sm mt-1">輸入房東提供的綁定碼即可登入</p>
        </div>

        <div className="card shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">綁定碼</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input tracking-widest text-center font-mono text-lg"
                placeholder="例如 A1B2C3D4"
                autoCapitalize="characters"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            沒有綁定碼？請向房東索取
          </p>
        </div>
      </div>
    </div>
  );
}
