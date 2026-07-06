import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { ToggleSwitch } from '../components/ui/ToggleRow';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

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
  jobRoles?: { id: string; name: string }[];
  employmentRecord?: {
    hireDate: string;
    terminationDate: string | null;
    status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
    bankName: string | null;
    bankBranch: string | null;
    bankAccountNumber: string | null;
  };
  insuranceProfile?: {
    laborInsuranceBracket: number;
    healthInsuranceBracket: number;
    pensionEmployer: number;
    pensionEmployee: number;
    dependents: number;
  };
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

  const [activeTab, setActiveTab] = useState<'basic' | 'employment' | 'insurance'>('basic');

  const [staff, setStaff] = useState<Staff | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Basic
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
  const [isActive, setIsActive] = useState(true);
  const [jobRoleIds, setJobRoleIds] = useState<string[]>([]);
  const [availableJobRoles, setAvailableJobRoles] = useState<{ id: string, name: string, locationId?: string | null }[]>([]);

  // Employment
  const [hireDate, setHireDate] = useState('');
  const [terminationDate, setTerminationDate] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'TERMINATED'>('ACTIVE');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  // Insurance
  const [laborInsuranceBracket, setLaborInsuranceBracket] = useState(0);
  const [healthInsuranceBracket, setHealthInsuranceBracket] = useState(0);
  const [pensionEmployer, setPensionEmployer] = useState(6.0);
  const [pensionEmployee, setPensionEmployee] = useState(0.0);
  const [dependents, setDependents] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    Promise.all([
      fetch(`/api/staff/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/locations?limit=100', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/job-roles', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([staffData, locData, rolesData]) => {
        if (!staffData.success) throw new Error(staffData.error || 'Failed to load staff');
        const s = staffData.data as Staff;
        setStaff(s);
        
        // Basic
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
        setJobRoleIds(s.jobRoles?.map((r: any) => r.id) || []);
        
        // Employment
        if (s.employmentRecord) {
          setHireDate(s.employmentRecord.hireDate ? new Date(s.employmentRecord.hireDate).toISOString().split('T')[0] : '');
          setTerminationDate(s.employmentRecord.terminationDate ? new Date(s.employmentRecord.terminationDate).toISOString().split('T')[0] : '');
          setEmploymentStatus(s.employmentRecord.status || 'ACTIVE');
          setBankName(s.employmentRecord.bankName || '');
          setBankBranch(s.employmentRecord.bankBranch || '');
          setBankAccountNumber(s.employmentRecord.bankAccountNumber || '');
        } else {
          setHireDate(new Date().toISOString().split('T')[0]);
        }

        // Insurance
        if (s.insuranceProfile) {
          setLaborInsuranceBracket(s.insuranceProfile.laborInsuranceBracket || 0);
          setHealthInsuranceBracket(s.insuranceProfile.healthInsuranceBracket || 0);
          setPensionEmployer(s.insuranceProfile.pensionEmployer ?? 6.0);
          setPensionEmployee(s.insuranceProfile.pensionEmployee ?? 0.0);
          setDependents(s.insuranceProfile.dependents || 0);
        }

        if (locData.success) setLocations(locData.data || []);
        if (rolesData.success) setAvailableJobRoles(rolesData.data || []);
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
          jobRoleIds,
          employmentRecord: hireDate ? {
            hireDate,
            terminationDate: terminationDate || null,
            status: employmentStatus,
            bankName: bankName || null,
            bankBranch: bankBranch || null,
            bankAccountNumber: bankAccountNumber || null,
          } : null,
          insuranceProfile: {
            laborInsuranceBracket: Number(laborInsuranceBracket),
            healthInsuranceBracket: Number(healthInsuranceBracket),
            pensionEmployer: Number(pensionEmployer),
            pensionEmployee: Number(pensionEmployee),
            dependents: Number(dependents),
          }
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
    <div className="max-w-3xl mx-auto pb-12">
      <PageHeader
        title={t('staff.editTitle')}
        backUrl="/staff"
        backText={t('staff.back')}
      />

      <PageContent>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50 px-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-2.5 px-6 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${activeTab === 'basic' ? 'border-primary-500 text-primary-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {t('staffEdit.tabs.basic') || '基本資料'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('employment')}
              className={`py-2.5 px-6 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${activeTab === 'employment' ? 'border-primary-500 text-primary-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {t('staffEdit.tabs.employment') || '人事資料'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('insurance')}
              className={`py-2.5 px-6 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${activeTab === 'insurance' ? 'border-primary-500 text-primary-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {t('staffEdit.tabs.insurance') || '勞健保設定'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
            )}

            {activeTab === 'basic' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.email')}</label>
                    <input
                      type="email"
                      value={staff.email}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 shadow-sm transition-all duration-200 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.name')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.role')}</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={user?.id === staff.id}
                      className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200 ${user?.id === staff.id ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.location')}</label>
                    <select
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
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
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
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
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('staffEdit.jobRoles') || '職位與技能 (Job Roles)'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    {availableJobRoles
                      .filter(r => !r.locationId || r.locationId === locationId)
                      .map(r => (
                        <label key={r.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={jobRoleIds.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) setJobRoleIds([...jobRoleIds, r.id]);
                              else setJobRoleIds(jobRoleIds.filter(id => id !== r.id));
                            }}
                            disabled={user?.id === staff.id}
                            className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{r.name}</span>
                        </label>
                      ))}
                    {availableJobRoles.filter(r => !r.locationId || r.locationId === locationId).length === 0 && (
                      <div className="text-sm text-gray-500 col-span-full py-2">
                        無可用職位，請先至「職位設定」新增
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <ToggleSwitch
                      checked={isActive}
                      onChange={setIsActive}
                      disabled={user?.id === staff.id}
                    />
                    <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'} ${user?.id === staff.id ? 'opacity-50' : ''}`}>
                      {t('staff.active')}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'employment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">到職與特休計算</h4>
                  <p className="text-xs text-blue-700">設定員工的到職日，系統將依此自動計算每年的特休假額度與年資。</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">到職日 (Hire Date) <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={hireDate}
                      onChange={(e) => setHireDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">在職狀態 (Status)</label>
                    <select
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value as 'ACTIVE' | 'SUSPENDED' | 'TERMINATED')}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                    >
                      <option value="ACTIVE">在職 (Active)</option>
                      <option value="SUSPENDED">留職停薪 (Suspended)</option>
                      <option value="TERMINATED">離職 (Terminated)</option>
                    </select>
                  </div>
                  {employmentStatus === 'TERMINATED' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">離職日 (Termination Date)</label>
                      <input
                        type="date"
                        value={terminationDate}
                        onChange={(e) => setTerminationDate(e.target.value)}
                        className="w-full md:w-1/2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">薪資轉帳帳戶 (Bank Details)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">銀行代碼/名稱</label>
                      <input
                        type="text"
                        placeholder="例: 808 玉山銀行"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">分行名稱</label>
                      <input
                        type="text"
                        placeholder="例: 中山分行"
                        value={bankBranch}
                        onChange={(e) => setBankBranch(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">匯款帳號</label>
                      <input
                        type="text"
                        placeholder="請輸入完整帳號"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="w-full md:w-1/2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insurance' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">勞健保級距與扣款</h4>
                  <p className="text-xs text-blue-700">設定投保級距後，系統在每月結算薪資時將自動計算並扣除員工自付額。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">勞保投保薪資級距 (Labor Insurance)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-400">NT$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={laborInsuranceBracket}
                        onChange={(e) => setLaborInsuranceBracket(Number(e.target.value))}
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">健保投保薪資級距 (Health Insurance)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-400">NT$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={healthInsuranceBracket}
                        onChange={(e) => setHealthInsuranceBracket(Number(e.target.value))}
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">依附眷屬人數 (Dependents)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={dependents}
                      onChange={(e) => setDependents(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">影響健保費員工自付額計算 (上限 3 人)</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">勞工退休金 (Pension)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">雇主提撥比例 (%)</label>
                      <input
                        type="number"
                        min="6"
                        max="100"
                        step="0.1"
                        value={pensionEmployer}
                        onChange={(e) => setPensionEmployer(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                      <p className="text-xs text-gray-500 mt-1">法定最低 6%</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">員工自提比例 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="6"
                        step="0.1"
                        value={pensionEmployee}
                        onChange={(e) => setPensionEmployee(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      />
                      <p className="text-xs text-gray-500 mt-1">最高 6%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? t('staff.actions.saving') : t('staff.actions.save')}
              </button>
            </div>
          </form>
        </div>

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
      </PageContent>
    </div>
  );
}
