import { api } from '../lib/api';
import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { API_BASE } from '../lib/api.js';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CustomGoogleLoginButton } from '../components/ui/CustomGoogleLoginButton';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-login/register if LIFF is already authorized
  useEffect(() => {
    if (settings.lineSettings?.liffId) {
      const initLiff = async () => {
        try {
          const liff = (window as any).liff;
          if (!liff) return;
          await liff.init({ liffId: settings.lineSettings!.liffId });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            const userEmail = liff.getDecodedIDToken()?.email;
            
            const data = await api.post<any>('/line/login', {
              lineUserId: profile.userId,
              lineDisplayName: profile.displayName,
              email: userEmail,
              name: profile.displayName
            });
            if (data.success) {
              localStorage.setItem('token', data.data.token);
              window.location.href = redirectPath;
            }
          }
        } catch (err) {
          console.warn('Auto LIFF registration skipped:', err);
        }
      };
      initLiff();
    }
  }, [settings.lineSettings?.liffId, redirectPath]);

  const handleLineRegister = () => {
    if (settings.lineSettings?.liffId) {
      const liff = (window as any).liff;
      if (liff) {
        if (redirectPath && redirectPath !== '/') {
          localStorage.setItem('line_login_redirect', redirectPath);
        }
        liff.login({ redirectUri: window.location.origin + '/login' });
      }
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password, phone: phone || undefined, address: address || undefined });
      navigate(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(token: string | undefined) {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      console.log('[Register] Verifying Google token...');
      const data = await api.post<any>('/auth/google/verify', { token });
      if (data.success) {
        console.log('[Register] Google Login successful!');
        localStorage.setItem('token', data.data.token);
        setTimeout(() => {
          window.location.replace(redirectPath);
        }, 800);
      } else {
        setError(data.error || 'Google Login failed');
      }
    } catch (err: any) {
      console.error('Google Login error:', err);
      setError(err.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-main">{t('auth.registerTitle')}</h1>
          <p className="mt-2 text-sub">{t('auth.registerSubtitle', { storeName: settings?.siteName || 'Our Store' })}</p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card p-8 rounded-xl shadow-sm border">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-sub mb-1">
              {t('auth.name')}
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="John Doe"
            />
          </div>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-sub mb-1">
              {t('auth.phone')}
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="555-123-4567"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="address" className="block text-sm font-medium text-sub mb-1">
              {t('auth.address')}
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="123 Main St"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-sub mb-1">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-sub mb-1">
              {t('auth.password')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5"
          >
            {loading ? t('auth.creating') : t('auth.createAccount')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="surface-card px-2 text-hint">{t('auth.socialRegister')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {settings.lineSettings?.liffId && (
              <button
                type="button"
                onClick={handleLineRegister}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#06C755] rounded-lg text-sm font-medium text-white hover:bg-[#05b34c] transition-colors"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE" className="w-5 h-5 brightness-0 invert" />
                {t('auth.lineRegister')}
              </button>
            )}
            {settings.googleSettings?.googleLoginClientId && (
              <div className="w-full flex justify-center mt-2">
                <GoogleOAuthProvider clientId={settings.googleSettings.googleLoginClientId}>
                  <CustomGoogleLoginButton
                    onSuccess={(token) => handleGoogleSuccess(token)}
                    onError={() => setError('Google Login Failed')}
                    label={t('auth.googleSignUp') || 'Google 註冊'}
                  />
                </GoogleOAuthProvider>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-600 mt-4">
            {t('auth.hasAccount')}{' '}
            <Link to={`/login${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`} className="text-primary-600 hover:text-primary-700 font-medium">
              {t('auth.loginLink')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
