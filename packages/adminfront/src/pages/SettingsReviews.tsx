import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    fetch('/api/settings/review', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
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
      const res = await fetch('/api/settings/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled, requireOrder, autoApprove, minimumRating }),
      });
      const data = await res.json();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">{t('settingsReviews.backToSettings')}</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('settingsReviews.reviewSettings')}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? t('settingsReviews.saving') : t('settingsReviews.saveChanges')}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsReviews.minRatingToReview')}</label>
          <input type="number" min={1} max={5} value={minimumRating} onChange={(e) => setMinimumRating(parseInt(e.target.value) || 1)} className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          <p className="mt-1 text-xs text-gray-500">{t('settingsReviews.minStarsRequiredToReview')}</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
        >
          {saving ? t('settingsReviews.saving') : t('settingsReviews.saveAllChanges')}
        </button>
      </div>
    </div>
  );
}
