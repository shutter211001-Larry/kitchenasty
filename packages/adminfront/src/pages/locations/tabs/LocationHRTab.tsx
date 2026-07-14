import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Save, Loader2, Info } from 'lucide-react';
import { api } from '../../../lib/api.js';
import toast from 'react-hot-toast';

export default function LocationHRTab({ locationId }: { locationId: string }) {
  const { t } = useTranslation();
  
  const [form, setForm] = useState<any>({
    hourlyNationalHolidayMultiplier: 2.0,
    monthlyNationalHolidayOvertime: true,
    enableOvertimePay: true,
    overtimeMultiplier1: 1.34,
    overtimeMultiplier2: 1.67,
    restDayMultiplier: 1.34,
    regularDayMultiplier: 2.0,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: any }>(`/locations/${locationId}`)
      .then((res: any) => {
        if (res.data) {
          setForm({
            hourlyNationalHolidayMultiplier: res.data.hourlyNationalHolidayMultiplier ?? 2.0,
            monthlyNationalHolidayOvertime: res.data.monthlyNationalHolidayOvertime ?? true,
            enableOvertimePay: res.data.enableOvertimePay ?? true,
            overtimeMultiplier1: res.data.overtimeMultiplier1 ?? 1.34,
            overtimeMultiplier2: res.data.overtimeMultiplier2 ?? 1.67,
            restDayMultiplier: res.data.restDayMultiplier ?? 1.34,
            regularDayMultiplier: res.data.regularDayMultiplier ?? 2.0,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/locations/${locationId}`, {
        hourlyNationalHolidayMultiplier: Number(form.hourlyNationalHolidayMultiplier),
        monthlyNationalHolidayOvertime: Boolean(form.monthlyNationalHolidayOvertime),
        enableOvertimePay: Boolean(form.enableOvertimePay),
        overtimeMultiplier1: Number(form.overtimeMultiplier1),
        overtimeMultiplier2: Number(form.overtimeMultiplier2),
        restDayMultiplier: Number(form.restDayMultiplier),
        regularDayMultiplier: Number(form.regularDayMultiplier),
      });
      toast.success(t('common.savedSuccessfully', '儲存成功'));
    } catch (err: any) {
      toast.error(err.message || t('common.saveFailed', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gray-500" />
            {t('locationForm.hrSettings', '人力資源與打卡規則')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">獨立設定該門市的國定假日與加班倍率</p>
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

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 md:col-span-2">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center mb-2">
              <Info className="w-4 h-4 mr-2" />
              {t('locationForm.nationalHolidayRules', '國定假日出勤規則 (依據勞基法第39條)')}
            </h4>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('locationForm.hourlyHolidayMultiplier', '時薪制國定假日雙倍薪倍率')}
                </label>
                <input
                  type="number" step="0.1"
                  value={form.hourlyNationalHolidayMultiplier}
                  onChange={e => updateField('hourlyNationalHolidayMultiplier', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.monthlyNationalHolidayOvertime}
                  onChange={e => updateField('monthlyNationalHolidayOvertime', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  {t('locationForm.monthlyHolidayOvertime', '月薪制員工國定假日出勤，自動給予免稅加班費')}
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                {t('locationForm.overtimeRules', '延長工時 (加班費) 規則 (依據勞基法第24條)')}
              </h4>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.enableOvertimePay}
                  onChange={e => updateField('enableOvertimePay', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  {t('locationForm.enableOvertime', '啟用加班費計算')}
                </label>
              </div>
            </div>
            
            {form.enableOvertimePay && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">平日加班前2小時倍率 (法定1.34)</label>
                  <input type="number" step="0.01" value={form.overtimeMultiplier1} onChange={e => updateField('overtimeMultiplier1', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">平日加班第3~4小時倍率 (法定1.67)</label>
                  <input type="number" step="0.01" value={form.overtimeMultiplier2} onChange={e => updateField('overtimeMultiplier2', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">休息日出勤加班倍率 (法定1.34起)</label>
                  <input type="number" step="0.01" value={form.restDayMultiplier} onChange={e => updateField('restDayMultiplier', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">例假日出勤倍率 (法定2.0)</label>
                  <input type="number" step="0.01" value={form.regularDayMultiplier} onChange={e => updateField('regularDayMultiplier', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
