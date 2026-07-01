import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsInvoice() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [hashKey, setHashKey] = useState('');
  const [hashIv, setHashIv] = useState('');

  useEffect(() => {
    fetch('/api/settings/invoice', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.enabled !== undefined) setEnabled(d.enabled);
          if (d.merchantId) setMerchantId(d.merchantId);
          if (d.hashKey) setHashKey(d.hashKey);
          if (d.hashIv) setHashIv(d.hashIv);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/invoice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          enabled,
          merchantId,
          hashKey,
          hashIv,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.hashKey) setHashKey(data.data.hashKey);
        if (data.data?.hashIv) setHashIv(data.data.hashIv);
        setSuccess(t('settingsInvoice.eInvoiceSettingsUpdated'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('settingsInvoice.saveFailed'));
      }
    } catch {
      setError(t('settingsInvoice.networkConnectionError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('settingsInvoice.loading')}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-2">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium flex items-center gap-1">
            <span>&larr;</span> {t('settingsInvoice.backToSystemSettings')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('settingsInvoice.eInvoiceSettings')}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? t('settingsInvoice.saving') : t('settingsInvoice.saveChanges')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm shadow-sm flex items-center gap-2">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg text-sm shadow-sm flex items-center gap-2">
          <span>✅</span>
          <div>{success}</div>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {t('settingsInvoice.ecpayEInvoice')}
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-700">{t('settingsInvoice.enableEInvoice')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsInvoice.merchantId')}</label>
              <input
                type="text"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder={t('settingsInvoice.exampleMerchantId')}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">HashKey</label>
              <input
                type="password"
                value={hashKey}
                onChange={(e) => setHashKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder={t('settingsInvoice.configuredKeepBlank')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">HashIV</label>
              <input
                type="password"
                value={hashIv}
                onChange={(e) => setHashIv(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder={t('settingsInvoice.configuredKeepBlank')}
              />
            </div>
          </div>
          
          <div className="flex items-center mt-4">
            <p className="text-xs text-gray-400 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 w-full">
              💡 <b>{t('settingsInvoice.note')}</b> {t('settingsInvoice.eInvoiceNoticeDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
