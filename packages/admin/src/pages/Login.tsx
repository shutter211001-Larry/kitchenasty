import { useState, FormEvent, useEffect } from 'react';

interface Props {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(true);

  useEffect(() => {
    fetch('/api/auth/staff/setup-status')
      .then(res => res.json())
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
    setLoading(true);

    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      let data: any;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error('伺服器連線失敗或正在維護中，請稍後再試。 (Server connection failed)');
      }

      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-400">夏特點餐系統</h1>
          <p className="text-gray-400 mt-1 text-sm">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 text-center">Sign In</h2>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {!hasSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setEmail('admin@shutter.com');
                setPassword('admin123');
              }}
              className="w-full bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200 flex items-center justify-center gap-2 mt-3"
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
