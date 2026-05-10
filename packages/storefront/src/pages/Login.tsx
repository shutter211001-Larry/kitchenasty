import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { API_BASE } from '../lib/api.js';

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithToken } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-login if LIFF is already authorized
  useEffect(() => {
    if (settings.lineSettings?.liffId) {
      const initLiff = async () => {
        try {
          const liff = (window as any).liff;
          if (!liff) return;
          await liff.init({ liffId: settings.lineSettings!.liffId });
          if (liff.isLoggedIn()) {
            // Already logged into LINE, try to login to Kitchenasty
            const profile = await liff.getProfile();
            const userEmail = liff.getDecodedIDToken()?.email;
            
            const res = await fetch(`${API_BASE}/line/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lineUserId: profile.userId,
                lineDisplayName: profile.displayName,
                email: userEmail,
                name: profile.displayName
              }),
            });
            const data = await res.json();
            if (data.success) {
              loginWithToken(data.data.token);
              navigate(redirectPath);
            }
          }
        } catch (err) {
          console.warn('Auto LIFF login skipped:', err);
        }
      };
      initLiff();
    }
  }, [settings.lineSettings?.liffId, redirectPath, navigate, loginWithToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-main">{t('auth.loginTitle')}</h1>
          <p className="mt-2 text-sub">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card p-8 rounded-xl shadow-sm border">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-sub mb-1">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-sub mb-1">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5"
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-input" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="surface-card px-2 text-hint">{t('auth.orContinue')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={`${API_BASE}/auth/google${redirectPath !== '/' ? `?state=${encodeURIComponent(`redirectUri=${redirectPath}`)}` : ''}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-sub hover:bg-gray-50 transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {t('auth.googleSignIn')}
            </a>
            
            {settings.lineSettings?.liffId && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const liff = (window as any).liff;
                    if (!liff) return;
                    await liff.init({ liffId: settings.lineSettings!.liffId });
                    if (!liff.isLoggedIn()) {
                      liff.login({ redirectUri: window.location.origin + '/login' });
                      return;
                    }
                    const profile = await liff.getProfile();
                    const userEmail = liff.getDecodedIDToken()?.email;

                    const res = await fetch(`${API_BASE}/line/login`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        lineUserId: profile.userId,
                        lineDisplayName: profile.displayName,
                        email: userEmail,
                        name: profile.displayName
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      localStorage.setItem('token', data.data.token);
                      window.location.href = redirectPath;
                    } else {
                      setError(data.error || 'LINE Login failed');
                    }
                  } catch (err: any) {
                    setError('LINE Login failed: ' + err.message);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#06C755] text-white rounded-lg text-sm font-bold hover:bg-[#05b34c] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2z" />
                </svg>
                {t('auth.lineSignIn')}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-sub mt-4">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('auth.registerLink')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
