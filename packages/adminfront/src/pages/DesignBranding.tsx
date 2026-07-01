import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { getFullUrl } from '../utils/url.js';

export default function DesignBranding() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [siteName, setSiteName] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSiteName(res.data.siteName);
          setSiteTitle(res.data.siteTitle);
          setSiteDescription(res.data.siteDescription || '');
          setLogo(getFullUrl(res.data.logo));
          setFavicon(getFullUrl(res.data.favicon));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ siteName, siteTitle, siteDescription }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('designBranding.brandSettingsUpdated'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('designBranding.saveFailed'));
      }
    } catch {
      setError(t('designBranding.networkConnectionError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(type: 'logo' | 'favicon', file: File) {
    const formData = new FormData();
    formData.append(type, file);

    try {
      const res = await fetch(`/api/settings/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (type === 'logo') setLogo(getFullUrl(data.data.logo));
        else setFavicon(getFullUrl(data.data.favicon));
        setSuccess(`${type === 'logo' ? t('designBranding.logo') : t('designBranding.favicon')} 已成功上傳`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('designBranding.uploadFailed'));
      }
    } catch {
      setError(t('designBranding.uploadError'));
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('designBranding.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('designBranding.brandingSettings')}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? t('designBranding.saving') : t('designBranding.saveChanges')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('designBranding.siteName')}</label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder={t('designBranding.cloudOrderingSystem')}
          />
          <p className="mt-1 text-xs text-gray-500">{t('designBranding.siteNameHelpText')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('designBranding.siteTitle')}</label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder={t('designBranding.siteTitlePlaceholder')}
          />
          <p className="mt-1 text-xs text-gray-500">{t('designBranding.siteTitleHelpText')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('designBranding.siteDescription')}</label>
          <textarea
            value={siteDescription}
            onChange={(e) => setSiteDescription(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder={t('designBranding.siteDescriptionPlaceholder')}
            rows={3}
          />
          <p className="mt-1 text-xs text-gray-500">{t('designBranding.seoDescriptionHelpText')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('designBranding.logoLabel')}</h2>
          {logo ? (
            <div className="mb-4">
              <img src={logo} alt="Logo" className="w-24 h-24 object-contain rounded-lg border border-gray-200" />
            </div>
          ) : (
            <div className="mb-4 w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              {t('designBranding.logoNotSet')}
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload('logo', file);
            }}
          />
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('designBranding.uploadLogo')}
          </button>
        </div>

        {/* Favicon */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('designBranding.faviconLabel')}</h2>
          {favicon ? (
            <div className="mb-4">
              <img src={favicon} alt="Favicon" className="w-16 h-16 object-contain rounded-lg border border-gray-200" />
            </div>
          ) : (
            <div className="mb-4 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
              {t('designBranding.faviconNotSet')}
            </div>
          )}
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload('favicon', file);
            }}
          />
          <button
            type="button"
            onClick={() => faviconInputRef.current?.click()}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('designBranding.uploadFavicon')}
          </button>
        </div>
      </div>
    </div>
  );
}
