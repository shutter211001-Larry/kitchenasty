import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToggleRow } from '../components/ui/ToggleRow';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { api } from '../lib/api.js';

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
    api.get('settings/invoice')
      
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
      const res = await api.put('settings/invoice', JSON.stringify({
          enabled,
          merchantId,
          hashKey,
          hashIv,
        }));
      const data = res;
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

  const actionButton = (
    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
      {saving ? t('settingsInvoice.saving') : t('settingsInvoice.saveChanges')}
    </button>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('settingsInvoice.eInvoiceSettings')}
        backUrl="/settings"
        backText={t('settingsInvoice.backToSystemSettings')}
        action={actionButton}
      />

      <PageContent>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              {t('settingsInvoice.ecpayEInvoice')}
            </h2>
            <ToggleRow
              title={t('settingsInvoice.enableEInvoice')}
              checked={enabled}
              onChange={setEnabled}
              className="bg-transparent border-none p-0 mb-4"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsInvoice.merchantId')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder={t('settingsInvoice.exampleMerchantId')} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">HashKey</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={hashKey} onChange={(e) => setHashKey(e.target.value)} placeholder={t('settingsInvoice.configuredKeepBlank')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">HashIV</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={hashIv} onChange={(e) => setHashIv(e.target.value)} placeholder={t('settingsInvoice.configuredKeepBlank')} />
              </div>
            </div>
            
            <div className="flex items-center mt-4">
              <p className="text-xs text-gray-400 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 w-full">
                💡 <b>{t('settingsInvoice.note')}</b> {t('settingsInvoice.eInvoiceNoticeDescription')}
              </p>
            </div>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
