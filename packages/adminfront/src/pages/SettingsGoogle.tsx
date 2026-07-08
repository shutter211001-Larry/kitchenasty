import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { api } from '../lib/api.js';

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
    api.get('settings/google')
      
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
      const res = await api.put('settings/google', JSON.stringify({
          geminiApiKey,
          googleLoginClientId,
          googleLoginClientSecret,
          gmailClientId,
          gmailClientSecret,
          gmailRefreshToken,
          googleMapsApiKey,
        }));
      const data = res;
      if (data.success) {
        if (data.data?.geminiApiKey) setGeminiApiKey(data.data.geminiApiKey);
        if (data.data?.googleLoginClientSecret) setGoogleLoginClientSecret(data.data.googleLoginClientSecret);
        if (data.data?.gmailClientSecret) setGmailClientSecret(data.data.gmailClientSecret);
        if (data.data?.gmailRefreshToken) setGmailRefreshToken(data.data.gmailRefreshToken);
        if (data.data?.googleMapsApiKey) setGoogleMapsApiKey(data.data.googleMapsApiKey);
        toast.success(t('settingsGoogle.googleSettingsSaved'));
      } else {
        toast.error(typeof data.error === 'string' ? data.error : t('settingsGoogle.saveFailed'));
      }
    } catch {
      toast.error(t('settingsGoogle.networkConnectionError'));
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

  const actionButton = (
    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
      {saving ? t('settingsGoogle.savingInProgress') : t('settingsGoogle.saveChanges')}
    </button>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('settingsGoogle.googleIntegrationSettings')}
        backUrl="/settings"
        backText={t('settingsGeneral.backToSettings')}
        action={actionButton}
      />

      <PageContent>
        <p className="text-sm text-gray-500 mb-6">
          {t('settingsGoogle.googleServicesDescription')}
        </p>

        <div className="space-y-6">
          {/* Gemini AI Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {t('settingsGoogle.geminiAiIntegration')}
            </h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gemini API Key</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder={t('settingsGoogle.configuredLeaveBlank')} />
              <p className="text-xs text-gray-500 mt-2">
                {t('settingsGoogle.geminiApiKeyDescription')}
              </p>
            </div>
          </div>

          {/* Google SSO Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {t('settingsGoogle.googleSsoIntegration')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={googleLoginClientId} onChange={(e) => setGoogleLoginClientId(e.target.value)} placeholder={t('settingsGoogle.exampleClientId')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={googleLoginClientSecret} onChange={(e) => setGoogleLoginClientSecret(e.target.value)} placeholder={t('settingsGoogle.configuredLeaveBlankSso')} />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
              {t('settingsGoogle.restartApiServerDescription')}
            </p>
          </div>

          {/* Gmail API Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {t('settingsGoogle.gmailApiIntegration')}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {t('settingsGoogle.gmailApiDescription')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={gmailClientId} onChange={(e) => setGmailClientId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={gmailClientSecret} onChange={(e) => setGmailClientSecret(e.target.value)} placeholder={t('settingsGoogle.configuredLeaveBlankGmail')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Refresh Token</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={gmailRefreshToken} onChange={(e) => setGmailRefreshToken(e.target.value)} placeholder={t('settingsGoogle.configuredLeaveBlankMaps')} />
              </div>
            </div>
          </div>

          {/* Google Maps Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {t('settingsGoogle.googleMapsIntegration')}
            </h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Google Maps API Key</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={googleMapsApiKey} onChange={(e) => setGoogleMapsApiKey(e.target.value)} placeholder={t('settingsGoogle.configuredKeepBlank')} />
            </div>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
