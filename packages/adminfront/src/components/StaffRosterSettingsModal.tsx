import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface StaffRosterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
}

export default function StaffRosterSettingsModal({ isOpen, onClose, locationId }: StaffRosterSettingsModalProps) {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [maxDaysPerWeek, setMaxDaysPerWeek] = useState(5);
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(40);
  const [availabilities, setAvailabilities] = useState<Array<{ dayOfWeek: number, startTime: string, endTime: string }>>([]);
  const [timeOffs, setTimeOffs] = useState<Array<{ date: string, reason: string | null }>>([]);
  
  const [newTimeOffDate, setNewTimeOffDate] = useState('');
  const [newTimeOffReason, setNewTimeOffReason] = useState('');

  // Fetch staff list for this location
  useEffect(() => {
    if (isOpen && locationId) {
      api.get<{ data: any[] }>(`/staff?locationId=${locationId}&limit=100`).then(res => {
        setStaffList(res.data || []);
      });
    }
  }, [isOpen, locationId]);

  // Fetch specific staff details when selected
  useEffect(() => {
    if (selectedStaffId) {
      setLoading(true);
      api.get<{ data: any }>(`/staff/${selectedStaffId}`).then(res => {
        const s = res.data;
        setMaxDaysPerWeek(s.maxDaysPerWeek ?? 5);
        setMaxHoursPerWeek(s.maxHoursPerWeek ?? 40);
        setAvailabilities(s.availabilities || []);
        setTimeOffs((s.timeOffs || []).map((t: any) => ({ ...t, date: new Date(t.date).toISOString().split('T')[0] })));
        setLoading(false);
      });
    } else {
      // reset
      setMaxDaysPerWeek(5);
      setMaxHoursPerWeek(40);
      setAvailabilities([]);
      setTimeOffs([]);
    }
  }, [selectedStaffId]);

  const handleSave = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    try {
      await api.patch(`/staff/${selectedStaffId}`, {
        maxDaysPerWeek: Number(maxDaysPerWeek),
        maxHoursPerWeek: Number(maxHoursPerWeek),
        availabilities,
        timeOffs,
      });
      alert(t('staff.actions.saveSuccess') || '儲存成功！');
    } catch (err) {
      console.error(err);
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            ⚙️ 員工排班限制設定
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選擇員工 (Select Staff)</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">-- 請選擇員工 --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">載入中...</div>
          ) : selectedStaffId ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('staffEdit.maxDaysPerWeek') || 'Max Days per Week'}</label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    step="1"
                    value={maxDaysPerWeek}
                    onChange={(e) => setMaxDaysPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('staffEdit.maxHoursPerWeek') || 'Max Hours per Week'}</label>
                  <input
                    type="number"
                    min="0"
                    max="168"
                    step="1"
                    value={maxHoursPerWeek}
                    onChange={(e) => setMaxHoursPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('staffEdit.availableDays') || 'Available Days & Time Slots (排班可用時段)'}</label>
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                    const dayNames = [
                      t('days.sunday') || 'Sun', t('days.monday') || 'Mon', t('days.tuesday') || 'Tue',
                      t('days.wednesday') || 'Wed', t('days.thursday') || 'Thu', t('days.friday') || 'Fri', t('days.saturday') || 'Sat'
                    ];
                    const avail = availabilities.find(a => a.dayOfWeek === dayIndex);
                    const isAvailable = !!avail;

                    return (
                      <div key={dayIndex} className={`flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${isAvailable ? 'bg-white border-primary-200 shadow-sm' : 'bg-gray-50/50 border-gray-200 opacity-70'}`}>
                        <label className="flex items-center gap-3 w-32 cursor-pointer">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={isAvailable}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAvailabilities([...availabilities, { dayOfWeek: dayIndex, startTime: '09:00', endTime: '18:00' }]);
                                } else {
                                  setAvailabilities(availabilities.filter(a => a.dayOfWeek !== dayIndex));
                                }
                              }}
                              className="peer h-5 w-5 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-all"
                            />
                          </div>
                          <span className={`text-sm font-bold ${isAvailable ? 'text-primary-700' : 'text-gray-500'}`}>{dayNames[dayIndex]}</span>
                        </label>
                        {isAvailable ? (
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex flex-col w-full">
                              <label className="text-[10px] text-gray-400 font-medium uppercase mb-1">開始時間</label>
                              <input
                                type="time"
                                value={avail.startTime}
                                onChange={(e) => {
                                  setAvailabilities(availabilities.map(a => 
                                    a.dayOfWeek === dayIndex ? { ...a, startTime: e.target.value } : a
                                  ));
                                }}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm shadow-inner transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
                              />
                            </div>
                            <span className="text-gray-400 text-sm mt-5">至</span>
                            <div className="flex flex-col w-full">
                              <label className="text-[10px] text-gray-400 font-medium uppercase mb-1">結束時間</label>
                              <input
                                type="time"
                                value={avail.endTime}
                                onChange={(e) => {
                                  setAvailabilities(availabilities.map(a => 
                                    a.dayOfWeek === dayIndex ? { ...a, endTime: e.target.value } : a
                                  ));
                                }}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm shadow-inner transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 text-sm text-gray-400 font-medium italic">此日不排班 (Unavailable)</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('staffEdit.timeOffTitle') || 'Specific Dates Off (指定休假/禁排日期)'}</label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={newTimeOffDate}
                      onChange={(e) => setNewTimeOffDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder={t('staffEdit.timeOffReason') || 'Reason (Optional)'}
                      value={newTimeOffReason}
                      onChange={(e) => setNewTimeOffReason(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTimeOffDate) return;
                        if (timeOffs.some(t => t.date === newTimeOffDate)) return;
                        setTimeOffs([...timeOffs, { date: newTimeOffDate, reason: newTimeOffReason || null }]);
                        setNewTimeOffDate('');
                        setNewTimeOffReason('');
                      }}
                      disabled={!newTimeOffDate}
                      className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors disabled:opacity-50"
                    >
                      {t('staffEdit.timeOffAdd') || 'Add Date'}
                    </button>
                  </div>

                  {timeOffs.length > 0 && (
                    <ul className="space-y-2 mt-4">
                      {timeOffs.map((to, i) => (
                        <li key={i} className="flex items-center justify-between bg-white px-4 py-2 border border-gray-200 rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{to.date}</span>
                            {to.reason && <span className="text-xs text-gray-500">{to.reason}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => setTimeOffs(timeOffs.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">請從上方選擇一位員工來進行設定</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedStaffId}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>
    </div>
  );
}
