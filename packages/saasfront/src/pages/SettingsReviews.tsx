import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { ToggleRow } from '../components/ui/ToggleRow';

export default function SettingsReviews() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [requireOrder, setRequireOrder] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [minimumRating, setMinimumRating] = useState(1);

  useEffect(() => {
    api.get<any>('/settings/review')
      
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.enabled !== undefined) setEnabled(d.enabled);
          if (d.requireOrder !== undefined) setRequireOrder(d.requireOrder);
          if (d.autoApprove !== undefined) setAutoApprove(d.autoApprove);
          if (d.minimumRating !== undefined) setMinimumRating(d.minimumRating);
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
      const data = await api.put<any>('/settings/review', {});
      if (data.success) {
        setSuccess(t('settingsReviews.reviewSettingsUpdated'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('settingsReviews.saveFailed'));
      }
    } catch {
      setError(t('settingsReviews.networkConnectionError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('settingsReviews.loading')}</div>;

  
      
  const actionButton = (
    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
      {saving ? t('settingsReviews.saving') : t('settingsReviews.saveChanges')}
    </button>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('settingsReviews.reviewSettings')}
        backUrl="/settings"
        backText={t('settingsReviews.backToSettings')}
        action={actionButton}
      />
      <PageContent>


      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <ToggleRow
          title={t('settingsReviews.enableCustomerReviews')}
          checked={enabled}
          onChange={setEnabled}
          className="bg-transparent border-none p-0"
        />

        <div className={`transition-opacity duration-200 space-y-4 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <ToggleRow
            title={t('settingsReviews.onlyCompletedOrdersCanReview')}
            checked={requireOrder}
            onChange={setRequireOrder}
            className="bg-transparent border-none p-0"
          />

          <ToggleRow
            title={t('settingsReviews.autoApproveReviews')}
            checked={autoApprove}
            onChange={setAutoApprove}
            className="bg-transparent border-none p-0"
          />
        </div>

        <div className={`pt-2 transition-opacity duration-200 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsReviews.minRatingToReview')}</label>
          <input className="max-w-xs w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={1} max={5} value={minimumRating} onChange={(e) => setMinimumRating(parseInt(e.target.value) || 1)} />
          <p className="mt-1 text-xs text-gray-500">{t('settingsReviews.minStarsRequiredToReview')}</p>
        </div>
        </div>
      </PageContent>
    </div>
  );
}

