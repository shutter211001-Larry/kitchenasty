import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ToggleSwitch } from '../components/ui/ToggleRow';
import { useTranslation } from 'react-i18next';

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  locationId: string | null;
  hourlyWage: number;
  salaryType: 'HOURLY' | 'MONTHLY';
  monthlyWage: number;
  maxDaysPerWeek: number;
  maxHoursPerWeek: number;
  availabilities: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  timeOffs: Array<{
    date: string;
    reason: string | null;
  }>;
  location: { id: string; name: string } | null;
}

interface Location {
  id: string;
  name: string;
}

export default function StaffEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [staff, setStaff] = useState<Staff | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [locationId, setLocationId] = useState('');
  const [salaryType, setSalaryType] = useState<'HOURLY' | 'MONTHLY'>('HOURLY');
  const [hourlyWage, setHourlyWage] = useState(0);
  const [monthlyWage, setMonthlyWage] = useState(0);
  const [maxDaysPerWeek, setMaxDaysPerWeek] = useState(5);
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(40);
  const [availabilities, setAvailabilities] = useState<Array<{ dayOfWeek: number, startTime: string, endTime: string }>>([]);
  const [timeOffs, setTimeOffs] = useState<Array<{ date: string, reason: string | null }>>([]);
  const [newTimeOffDate, setNewTimeOffDate] = useState('');
  const [newTimeOffReason, setNewTimeOffReason] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    Promise.all([
      fetch(`/api/staff/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/locations?limit=100', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([staffData, locData]) => {
        if (!staffData.success) throw new Error(staffData.error || 'Failed to load staff');
        const s = staffData.data;
        setStaff(s);
        setName(s.name);
        setRole(s.role);
        setPhone(s.phone || '');
        setLocationId(s.locationId || '');
        setSalaryType(s.salaryType || 'HOURLY');
        setHourlyWage(s.hourlyWage || 0);
        setMonthlyWage(s.monthlyWage || 0);
        setMaxDaysPerWeek(s.maxDaysPerWeek ?? 5);
        setMaxHoursPerWeek(s.maxHoursPerWeek ?? 40);
        setAvailabilities(s.availabilities || []);
        setTimeOffs((s.timeOffs || []).map((t: any) => ({ ...t, date: new Date(t.date).toISOString().split('T')[0] })));
        setIsActive(s.isActive);
        if (locData.success) setLocations(locData.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          role,
          phone: phone || null,
          locationId: locationId || null,
          salaryType,
          hourlyWage: Number(hourlyWage),
          monthlyWage: Number(monthlyWage),
          maxDaysPerWeek: Number(maxDaysPerWeek),
          maxHoursPerWeek: Number(maxHoursPerWeek),
          availabilities,
          timeOffs,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      navigate('/staff');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('staff.deleteConfirm') || 'Are you sure you want to delete this staff member? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      navigate('/staff');
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!staff) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || t('staff.notFound') || 'Staff not found'}</div>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/staff" className="text-gray-400 hover:text-gray-600">
          {t('staff.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('staff.editTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.email')}</label>
          <input
            type="email"
            value={staff.email}
            disabled
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.role')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={user?.id === staff.id}
            className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${user?.id === staff.id ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
          >
            <option value="STAFF">{t('staff.roles.staff')}</option>
            <option value="MANAGER">{t('staff.roles.manager')}</option>
            <option value="SUPER_ADMIN">{t('staff.roles.superAdmin')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.phone')}</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.location')}</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="">{t('staff.none')}</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staffEdit.salaryType') || 'Salary Type'}</label>
          <select
            value={salaryType}
            onChange={(e) => setSalaryType(e.target.value as 'HOURLY' | 'MONTHLY')}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="HOURLY">{t('staffEdit.hourly') || 'Hourly (時薪)'}</option>
            <option value="MONTHLY">{t('staffEdit.monthly') || 'Monthly (月薪)'}</option>
          </select>
        </div>

        {salaryType === 'HOURLY' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('staffEdit.hourlyWage') || 'Hourly Wage'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('staffEdit.monthlyWage') || 'Monthly Wage'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={monthlyWage}
              onChange={(e) => setMonthlyWage(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('staffEdit.schedulingSettings') || 'Scheduling Settings'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('staffEdit.maxDaysPerWeek') || 'Max Days per Week'}</label>
              <input
                type="number"
                min="0"
                max="7"
                step="1"
                value={maxDaysPerWeek}
                onChange={(e) => setMaxDaysPerWeek(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">{t('staffEdit.availability') || 'Available Days (Time Slots)'}</label>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const dayNames = [
                t('days.sunday') || 'Sun', t('days.monday') || 'Mon', t('days.tuesday') || 'Tue',
                t('days.wednesday') || 'Wed', t('days.thursday') || 'Thu', t('days.friday') || 'Fri', t('days.saturday') || 'Sat'
              ];
              const avail = availabilities.find(a => a.dayOfWeek === dayIndex);
              const isAvailable = !!avail;

              return (
                <div key={dayIndex} className="flex items-center gap-4">
                  <label className="flex items-center gap-2 w-24">
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
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{dayNames[dayIndex]}</span>
                  </label>
                  {isAvailable && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={avail.startTime}
                        onChange={(e) => {
                          setAvailabilities(availabilities.map(a => 
                            a.dayOfWeek === dayIndex ? { ...a, startTime: e.target.value } : a
                          ));
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                      <span className="text-gray-500 text-sm">to</span>
                      <input
                        type="time"
                        value={avail.endTime}
                        onChange={(e) => {
                          setAvailabilities(availabilities.map(a => 
                            a.dayOfWeek === dayIndex ? { ...a, endTime: e.target.value } : a
                          ));
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6">
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
                    // Prevent duplicates
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

        <label className="flex items-center gap-2 cursor-pointer pt-4 border-t border-gray-200">
          <ToggleSwitch
            checked={isActive}
            onChange={setIsActive}
            disabled={user?.id === staff.id}
          />
          <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'} ${user?.id === staff.id ? 'opacity-50' : ''}`}>
            {t('staff.active')}
          </span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {saving ? t('staff.actions.saving') : t('staff.actions.save')}
        </button>
      </form>

      {user?.role === 'SUPER_ADMIN' && staff && user.id !== staff.id && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <h3 className="text-lg font-bold text-red-600 mb-2">{t('staff.dangerZone')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('staff.deleteWarning')}
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg font-semibold border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {deleting ? t('staff.actions.deleting') : t('staff.actions.delete')}
          </button>
        </div>
      )}
    </div>
  );
}
