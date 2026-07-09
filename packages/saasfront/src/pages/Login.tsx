import { useState, FormEvent, useEffect } from 'react';
import { api } from '../lib/api';

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

  useEffect(() => {
    api.get<any>('/auth/staff/setup-status')
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
      const data = await api.post<any>('/auth/staff/login', { email, password });
      onLogin(data.data.token);
    } catch (err: any) {
      setError(err.message);
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
      const data = await api.post<any>('/auth/staff/forgot-password', { email });
      setMessage(data.message || '重置信已寄出');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration for SaaS distinction */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]"></div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">夏特點餐平台系統</h1>
          <p className="text-indigo-200/60 mt-2 text-sm uppercase tracking-widest font-medium">SaaS 超級管理中心</p>
        </div>

        <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-white text-center">
            {isForgotPassword ? '忘記密碼' : '管理員登入'}
          </h2>

          {message && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">電子郵件信箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="admin@shutter.com"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-300">密碼</label>
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
                >
                  忘記密碼？
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isForgotPassword}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-500/25"
          >
            {loading ? (isForgotPassword ? '發送中...' : '登入中...') : (isForgotPassword ? '發送重置信件' : '登入系統')}
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
              <span>✨</span>
              <span>一鍵帶入預設管理員</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
