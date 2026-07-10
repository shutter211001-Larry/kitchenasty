import { useState, FormEvent, useEffect } from 'react';
import { api } from '../lib/api.js';

interface Props {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [availableTenants, setAvailableTenants] = useState<{ id: string; name: string; domain: string }[]>([]);
  const [loginSessionToken, setLoginSessionToken] = useState('');

  useEffect(() => {
    api.get('auth/staff/setup-status')
      .then(data => {
        if (data && typeof data.hasSuperAdmin === 'boolean') {
          setHasSuperAdmin(data.hasSuperAdmin);
        }
      })
      .catch(err => console.error('Failed to fetch setup status:', err));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('auth/staff/login', { email, password });
      
      if (res.needsTenantSelection) {
        setAvailableTenants(res.availableTenants);
        setLoginSessionToken(res.loginSessionToken);
        setLoading(false);
        return;
      }
      
      let data: any = res;
      if (data.data?.user?.tenantId) {
        localStorage.setItem('tenantId', data.data.user.tenantId);
      }
      
      onLogin(data.data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTenant(tenantId: string) {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('auth/staff/select-tenant', { loginSessionToken, tenantId });
      let data: any = res;
      if (data.data?.user?.tenantId) {
        localStorage.setItem('tenantId', data.data.user.tenantId);
      }
      onLogin(data.data.token);
    } catch (err: any) {
      setError(err.message);
      setAvailableTenants([]); // Reset on failure
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('請輸入 Email');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('auth/staff/forgot-password', { email });
      setMessage(res.message || '重置信已寄出');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (availableTenants.length > 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
            請選擇要進入的餐廳
          </h2>
          
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
          
          <div className="space-y-3">
            {availableTenants.map(tenant => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id)}
                disabled={loading}
                className="w-full bg-gray-50 text-gray-800 py-4 px-4 rounded-lg font-medium border border-gray-200 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>{tenant.name}</span>
                <span className="text-primary-500">→</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setAvailableTenants([])}
            className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 mt-4 cursor-pointer"
          >
            返回重新登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-400">夏特點餐系統</h1>
          <p className="text-gray-400 mt-1 text-sm">Admin Panel</p>
        </div>

        <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 text-center">
            {isForgotPassword ? '忘記密碼' : 'Sign In'}
          </h2>

          {message && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
                >
                  忘記密碼？
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isForgotPassword}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (isForgotPassword ? '發送中...' : 'Signing in...') : (isForgotPassword ? '發送重置信' : 'Sign In')}
          </button>

          {isForgotPassword && (
            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
              className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 mt-4 cursor-pointer"
            >
              返回登入
            </button>
          )}

          {!isForgotPassword && !hasSuperAdmin && import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => {
                setEmail('admin@shutter.com');
                setPassword('admin123');
              }}
              className="w-full bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200 flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              一鍵帶入預設管理員
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
