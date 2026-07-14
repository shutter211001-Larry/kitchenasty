import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api.js';
import toast from 'react-hot-toast';

interface OperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

const defaultHours: OperatingHour[] = Array.from({ length: 7 }).map((_, i) => ({
  dayOfWeek: i,
  openTime: '10:00',
  closeTime: '22:00',
  isClosed: false,
}));

export default function LocationHoursTab({ locationId }: { locationId: string }) {
  const { t } = useTranslation();
  const DAYS = [t('locationForm.sunday'), t('locationForm.monday'), t('locationForm.tuesday'), t('locationForm.wednesday'), t('locationForm.thursday'), t('locationForm.friday'), t('locationForm.saturday')];
  
  const [hours, setHours] = useState<OperatingHour[]>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: { operatingHours?: any[] } }>(`/locations/${locationId}`)
      .then((res: any) => {
        if (res.data.operatingHours?.length) {
          setHours(res.data.operatingHours.map((h: any) => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/locations/${locationId}`, { operatingHours: hours });
      toast.success(t('common.savedSuccessfully', '儲存成功'));
    } catch (err: any) {
      toast.error(err.message || t('common.saveFailed', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (dayIndex: number) => {
    setHours(prev => [...prev, { dayOfWeek: dayIndex, openTime: '10:00', closeTime: '22:00', isClosed: false }].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
  };

  const updateHour = (index: number, field: keyof OperatingHour, value: any) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const removeHour = (index: number) => {
    setHours(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            {t('locationForm.businessHoursSettings')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">設定該門市的一週營業時間</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {t('common.save', '儲存')}
        </button>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {DAYS.map((day, dayIndex) => {
            const dayHours = hours.map((h, i) => ({ ...h, originalIndex: i })).filter((h) => h.dayOfWeek === dayIndex);
            return (
              <div key={dayIndex} className="flex flex-col sm:flex-row items-start sm:items-center py-4 border-b border-gray-100 last:border-0">
                <div className="w-32 font-medium text-gray-900 mb-2 sm:mb-0 flex items-center justify-between">
                  {day}
                  <button type="button" onClick={() => addTimeSlot(dayIndex)} className="text-primary-600 hover:text-primary-700 sm:hidden">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {dayHours.length === 0 ? (
                    <div className="text-gray-500 text-sm flex items-center">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">{t('locationForm.closed')}</span>
                    </div>
                  ) : (
                    dayHours.map((h) => (
                      <div key={h.originalIndex} className="flex items-center space-x-2">
                        <label className="flex items-center space-x-2 mr-4">
                          <input
                            type="checkbox"
                            checked={h.isClosed}
                            onChange={(e) => updateHour(h.originalIndex, 'isClosed', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{t('locationForm.closed')}</span>
                        </label>
                        {!h.isClosed && (
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="time"
                              value={h.openTime}
                              onChange={(e) => updateHour(h.originalIndex, 'openTime', e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                              type="time"
                              value={h.closeTime}
                              onChange={(e) => updateHour(h.originalIndex, 'closeTime', e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                          </div>
                        )}
                        <button type="button" onClick={() => removeHour(h.originalIndex)} className="p-1 text-red-600 hover:text-red-800 rounded flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button type="button" onClick={() => addTimeSlot(dayIndex)} className="hidden sm:flex ml-4 p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-full">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
