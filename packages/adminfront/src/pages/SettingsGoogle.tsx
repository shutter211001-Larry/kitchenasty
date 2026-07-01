import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function SettingsGoogle() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gemini AI
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Google SSO
  const [googleLoginClientId, setGoogleLoginClientId] = useState('');
  const [googleLoginClientSecret, setGoogleLoginClientSecret] = useState('');

  // Gmail API
  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');
  const [gmailRefreshToken, setGmailRefreshToken] = useState('');

  // Google Maps
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');

  useEffect(() => {
    fetch('/api/settings/google', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.geminiApiKey) setGeminiApiKey(d.geminiApiKey);
          if (d.googleLoginClientId) setGoogleLoginClientId(d.googleLoginClientId);
          if (d.googleLoginClientSecret) setGoogleLoginClientSecret(d.googleLoginClientSecret);
          if (d.gmailClientId) setGmailClientId(d.gmailClientId);
          if (d.gmailClientSecret) setGmailClientSecret(d.gmailClientSecret);
          if (d.gmailRefreshToken) setGmailRefreshToken(d.gmailRefreshToken);
          if (d.googleMapsApiKey) setGoogleMapsApiKey(d.googleMapsApiKey);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/google', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          geminiApiKey,
          googleLoginClientId,
          googleLoginClientSecret,
          gmailClientId,
          gmailClientSecret,
          gmailRefreshToken,
          googleMapsApiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.geminiApiKey) setGeminiApiKey(data.data.geminiApiKey);
        if (data.data?.googleLoginClientSecret) setGoogleLoginClientSecret(data.data.googleLoginClientSecret);
        if (data.data?.gmailClientSecret) setGmailClientSecret(data.data.gmailClientSecret);
        if (data.data?.gmailRefreshToken) setGmailRefreshToken(data.data.gmailRefreshToken);
        if (data.data?.googleMapsApiKey) setGoogleMapsApiKey(data.data.googleMapsApiKey);
        toast.success(t('autoGen.admin.key1334'));
      } else {
        toast.error(typeof data.error === 'string' ? data.error : t('autoGen.admin.key1335'));
      }
    } catch {
      toast.error(t('autoGen.admin.key1336'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{t('autoGen.admin.key1337')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('autoGen.admin.key1338')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? t('autoGen.admin.key1339') : t('autoGen.admin.key1340')}
        </button>
      </div>

      <div className="grid gap-6">
        {/* Gemini AI Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {t('autoGen.admin.key1341')}
          </h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gemini API Key</label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder={t('autoGen.admin.key1342')}
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('autoGen.admin.key1343')}
            </p>
          </div>
        </div>

        {/* Google SSO Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {t('autoGen.admin.key1344')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
              <input
                type="text"
                value={googleLoginClientId}
                onChange={(e) => setGoogleLoginClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder={t('autoGen.admin.key1345')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
              <input
                type="password"
                value={googleLoginClientSecret}
                onChange={(e) => setGoogleLoginClientSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder={t('autoGen.admin.key1346')}
              />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
            {t('autoGen.admin.key1347')}
          </p>
        </div>

        {/* Gmail API Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {t('autoGen.admin.key1348')}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t('autoGen.admin.key1349')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
              <input
                type="text"
                value={gmailClientId}
                onChange={(e) => setGmailClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
              <input
                type="password"
                value={gmailClientSecret}
                onChange={(e) => setGmailClientSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder={t('autoGen.admin.key1350')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Refresh Token</label>
              <input
                type="password"
                value={gmailRefreshToken}
                onChange={(e) => setGmailRefreshToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder={t('autoGen.admin.key1351')}
              />
            </div>
          </div>
        </div>

        {/* Google Maps Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {t('autoGen.admin.key1352')}
          </h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Google Maps API Key</label>
            <input
              type="password"
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder={t('autoGen.admin.key1353')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
