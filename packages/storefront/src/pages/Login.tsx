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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-trigger LINE login if redirected back from LINE
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state && settings.lineSettings?.liffId && !loading && !success) {
      console.log('[Login] LIFF redirect detected, auto-triggering login...');
      handleLineLogin();
    }
  }, [searchParams, settings.lineSettings?.liffId]);

  async function handleLineLogin() {
    setLoading(true);
    try {
      console.log('[Login] Starting LINE Login (Auto/Manual)...');
      const liff = (window as any).liff;
      if (!liff) {
        setError('LINE SDK not loaded');
        setLoading(false);
        return;
      }

      await liff.init({ liffId: settings.lineSettings!.liffId });
      if (!liff.isLoggedIn()) {
        if (redirectPath && redirectPath !== '/') {
          localStorage.setItem('line_login_redirect', redirectPath);
        }
        liff.login({ redirectUri: window.location.origin + '/login' });
        return;
      }
      const profile = await liff.getProfile();
      const userEmail = liff.getDecodedIDToken()?.email;

      console.log('[Login] LINE Profile obtained, authenticating with backend...');
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
        console.log('[Login] LINE Login successful!');
        setSuccess(true);
        localStorage.setItem('token', data.data.token);
        
        const savedRedirect = localStorage.getItem('line_login_redirect');
        const finalRedirect = savedRedirect || redirectPath;
        localStorage.removeItem('line_login_redirect');

        setTimeout(() => {
          window.location.replace(finalRedirect);
        }, 800);
      } else {
        setError(data.error || 'LINE Login failed');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('LINE Login error:', err);
      setError('LINE Login error: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      console.log('[Login] Submitting credentials...');
      await login(email, password);
      console.log('[Login] Success! Redirecting to:', redirectPath);
      setSuccess(true);
      
      // Clear sensitive fields immediately
      setEmail('');
      setPassword('');

      // Force redirect after a short delay
      const savedRedirect = localStorage.getItem('line_login_redirect');
      const finalRedirect = savedRedirect || redirectPath;
      localStorage.removeItem('line_login_redirect');

      setTimeout(() => {
        window.location.replace(finalRedirect);
      }, 800);
    } catch (err: any) {
      console.error('[Login] Submission failed:', err);
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

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('autoGen.store.key93')}
            </div>
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
              href={`${API_BASE}/auth/google?state=${encodeURIComponent(JSON.stringify({ redirect: redirectPath }))}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-sub hover:bg-gray-50 transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {t('auth.googleSignIn')}
            </a>
            
            {settings.lineSettings?.liffId && (
              <button
                type="button"
                onClick={handleLineLogin}
                className="w-full flex items-center justify-center gap-3 py-3 bg-[#06C755] text-white rounded-xl text-base font-black hover:bg-[#05b34c] transition-all active:scale-[0.98] shadow-lg shadow-[#06C755]/20 group"
              >
                <div className="bg-white p-1.5 rounded-full shadow-sm flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.052.303-.25 1.184.108 1.291.357.107.946-.459 1.324-.827 3.276-3.196 6.014-5.836 6.014-5.836 4.191-1.01 5.587-4.102 5.587-7.164zm-17.485 3.391h-1.61c-.347 0-.63-.283-.63-.63v-5.46c0-.347.283-.63.63-.63h1.61c.347 0 .63.283.63.63v5.46c0 .347-.283.63-.63.63zm3.748 0h-1.61c-.347 0-.63-.283-.63-.63v-5.46c0-.347.283-.63.63-.63h1.61c.347 0 .63.283.63.63v5.46c0 .347-.283.63-.63.63zm3.748-1.26h-1.132v-1.144h1.132c.347 0 .63-.283.63-.63v-.539c0-.347-.283-.63-.63-.63h-1.132v-1.144h1.132c.347 0 .63-.283.63-.63v-.539c0-.347-.283-.63-.63-.63h-2.12c-.347 0-.63.283-.63.63v5.46c0 .347.283.63.63.63h2.12c.347 0 .63-.283.63-.63v-.539c0-.348-.283-.631-.63-.631zm3.748 1.26h-1.61c-.347 0-.63-.283-.63-.63v-5.46c0-.347.283-.63.63-.63h1.61c.347 0 .63.283.63.63v5.46c0 .347-.283.63-.63.63z" />
                  </svg>
                </div>
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
