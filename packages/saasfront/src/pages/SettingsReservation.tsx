import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToggleRow } from '../components/ui/ToggleRow';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

export default function SettingsReservation() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [timeInterval, setTimeInterval] = useState(30);
  const [stayTime, setStayTime] = useState(90);
  const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState(30);
  const [minCancellationNoticeHours, setMinCancellationNoticeHours] = useState(2);
  const [autoConfirm, setAutoConfirm] = useState(false);

  useEffect(() => {
    api.get<any>('/settings/reservation')
      
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.enabled !== undefined) setEnabled(d.enabled);
          if (d.timeInterval !== undefined) setTimeInterval(d.timeInterval);
          if (d.stayTime !== undefined) setStayTime(d.stayTime);
          if (d.maxAdvanceBookingDays !== undefined) setMaxAdvanceBookingDays(d.maxAdvanceBookingDays);
          if (d.minCancellationNoticeHours !== undefined) setMinCancellationNoticeHours(d.minCancellationNoticeHours);
          if (d.autoConfirm !== undefined) setAutoConfirm(d.autoConfirm);
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
      const data = await api.put<any>('/settings/reservation', {});
      if (data.success) {
        setSuccess('Reservation settings updated');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('settingsReservation.loading')}</div>;

  const actionButton = (
    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
      {saving ? t('settingsReservation.saving') : t('settingsReservation.saveChanges')}
    </button>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('settingsReservation.reservationSettings')}
        backUrl="/settings"
        backText={t('settingsReservation.backToSettings')}
        action={actionButton}
      />

      <PageContent>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <ToggleRow
            title={t('settingsReservation.enableOnlineReservation')}
            checked={enabled}
            onChange={setEnabled}
            className="bg-transparent border-none p-0"
          />

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsReservation.reservationIntervalMinutes')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={1} value={timeInterval} onChange={(e) => setTimeInterval(parseInt(e.target.value) || 1)} />
              <p className="mt-1 text-xs text-gray-500">{t('settingsReservation.reservationTimeSlotInterval')}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsReservation.diningTimeMinutes')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={1} value={stayTime} onChange={(e) => setStayTime(parseInt(e.target.value) || 1)} />
              <p className="mt-1 text-xs text-gray-500">{t('settingsReservation.averageDiningTime')}</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsReservation.maxAdvanceReservationDays')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={1} value={maxAdvanceBookingDays} onChange={(e) => setMaxAdvanceBookingDays(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsReservation.latestCancellationNoticeHours')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} value={minCancellationNoticeHours} onChange={(e) => setMinCancellationNoticeHours(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className={`transition-opacity duration-200 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <ToggleRow
              title={t('settingsReservation.autoConfirmReservation')}
              checked={autoConfirm}
              onChange={setAutoConfirm}
              className="bg-transparent border-none p-0 mt-4"
            />
          </div>
        </div>
      </PageContent>
    </div>
  );
}

