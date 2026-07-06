import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Link } from 'react-router-dom';
import { List, Calendar as CalendarIcon, Printer } from 'lucide-react';
import StaffRosterSettingsModal from '../components/StaffRosterSettingsModal.js';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

interface Shift {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  dayType: string;
  user: { name: string };
  jobRole?: { name: string };
}

interface ShiftRequirement {
  id: string;
  date: string;
  jobRoleId: string;
  startTime: string;
  endTime: string;
  count: number;
  jobRole?: { name: string };
}

// Extend Shift to allow our fake shortage rows
interface DisplayShift extends Shift {
  isShortage?: boolean;
}

export default function RosterManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [requirements, setRequirements] = useState<ShiftRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  // Initialize dates to current week
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      api.get<{ data: any[] }>('/locations?limit=50').then(res => {
        setLocations(res.data);
        if (res.data.length > 0) {
          setSelectedLocation(res.data[0].id);
        }
      });
    } else if (user?.locationId) {
      setSelectedLocation(user.locationId);
    }
  }, [user]);

  const fetchRosterData = async () => {
    if (!selectedLocation || !startDate || !endDate) return;
    setLoading(true);
    try {
      const [shiftsRes, reqsRes] = await Promise.all([
        api.get<{ data: Shift[] }>(`/roster/shifts?locationId=${selectedLocation}&startDate=${startDate}&endDate=${endDate}`),
        api.get<{ data: ShiftRequirement[] }>(`/roster/requirements?locationId=${selectedLocation}&startDate=${startDate}&endDate=${endDate}`)
      ]);
      setShifts(shiftsRes.data || []);
      setRequirements(reqsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, [selectedLocation, startDate, endDate]);

  const combinedShifts = useMemo(() => {
    const combined: DisplayShift[] = [...shifts];
    let shortageTotal = 0;
    
    requirements.forEach(req => {
      const reqDateStr = new Date(req.date).toLocaleDateString();
      
      const fulfilledCount = shifts.filter(s => 
        new Date(s.date).toLocaleDateString() === reqDateStr &&
        s.jobRole?.name === req.jobRole?.name &&
        s.startTime === req.startTime &&
        s.endTime === req.endTime
      ).length;

      const shortage = req.count - fulfilledCount;
      if (shortage > 0) {
        shortageTotal += shortage;
        for (let i = 0; i < shortage; i++) {
          combined.push({
            id: `shortage-${req.id}-${i}`,
            userId: 'MISSING',
            date: req.date,
            startTime: req.startTime,
            endTime: req.endTime,
            dayType: 'WORKDAY',
            user: { name: '⚠️ 缺額 (Shortage)' },
            jobRole: { name: req.jobRole?.name || '無指定' },
            isShortage: true
          });
        }
      }
    });
    
    // Sort combined by date then start time
    combined.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.startTime.localeCompare(b.startTime);
    });
    
    return { combined, shortageTotal };
  }, [shifts, requirements]);

  const handleAutoSchedule = async (mode: 'COST_OPTIMIZED' | 'FAIR') => {
    if (!selectedLocation || !startDate || !endDate) return;
    if (!window.confirm(`確定要執行 ${mode === 'COST_OPTIMIZED' ? '支出優化' : '公平分配'} 自動排班嗎？這將覆蓋現有班表！`)) return;
    
    setGenerating(true);
    try {
      await api.post('/roster/auto-schedule', {
        locationId: selectedLocation,
        startDate,
        endDate,
        mode
      });
      alert('排班指令已發送！如有人力不足的缺額將會標示於班表中。');
      fetchRosterData();
    } catch (err) {
      console.error(err);
      alert('自動排班失敗，請確認是否已設定門市需求與員工可用時段。');
    } finally {
      setGenerating(false);
    }
  };

  const renderCalendarView = () => {
    // Group `combinedShifts.combined` by Date string
    if (!startDate || !endDate) return null;
    
    const days: { date: string, shifts: DisplayShift[] }[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      const dayShifts = combinedShifts.combined.filter(shift => new Date(shift.date).toISOString().split('T')[0] === dStr);
      days.push({ date: dStr, shifts: dayShifts });
      current.setDate(current.getDate() + 1);
    }

    return (
      <div id="printable-roster" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none mb-6">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:bg-white print:border-b-2 print:border-gray-900 hidden print:flex">
          <h2 className="text-xl font-bold text-gray-900">
            門市排班表 ({new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()})
          </h2>
        </div>
        <div 
          className="divide-y md:divide-y-0 md:divide-x divide-gray-200 border-b border-gray-200 print:divide-y-0 print:divide-x"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length || 1}, minmax(0, 1fr))` }}
        >
          {days.map((day, i) => (
            <div key={i} className="min-h-[400px] flex flex-col bg-white print:break-inside-avoid">
              <div className="bg-gray-50 p-3 text-center border-b border-gray-200 print:bg-gray-100">
                <div className="font-bold text-sm text-gray-800">
                  {new Date(day.date).toLocaleDateString('zh-TW', { weekday: 'short' })}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(day.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                </div>
              </div>
              <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[600px] print:max-h-none print:overflow-visible">
                {day.shifts.map(shift => (
                  <div key={shift.id} className={`p-2.5 rounded-lg border text-xs shadow-sm ${shift.isShortage ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {!shift.isShortage && (
                        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                          {shift.user?.name.charAt(0)}
                        </div>
                      )}
                      <div className={`font-bold truncate ${shift.isShortage ? 'text-red-700' : 'text-gray-900'}`}>
                        {shift.user?.name}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <div className="text-gray-500 font-medium">
                        {shift.jobRole?.name || '-'}
                      </div>
                      <div className="text-gray-600 font-mono font-medium text-[11px] bg-gray-50 px-1.5 py-0.5 rounded inline-block w-fit">
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  </div>
                ))}
                {day.shifts.length === 0 && (
                  <div className="text-gray-300 text-center py-6 text-xs font-medium">無班次</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-12">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span className="text-3xl">📅</span>
            排班管理與自動排班 (Roster Management)
          </div>
        }
        action={
          <div className="flex gap-2">
            <Link
              to={`/attendance/requirements?locationId=${selectedLocation}`}
              className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium shadow-sm transition-all active:scale-95 ${!selectedLocation ? 'bg-gray-100 text-gray-400 pointer-events-none' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              📊 門市人力需求設定
            </Link>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              disabled={!selectedLocation}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
            >
              ⚙️ 員工排班限制設定
            </button>
            <button
              onClick={() => handleAutoSchedule('COST_OPTIMIZED')}
              disabled={generating || !selectedLocation}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium shadow hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '💰'}
              支出優化排班
            </button>
            
            <button
              onClick={() => handleAutoSchedule('FAIR')}
              disabled={generating || !selectedLocation}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '⚖️'}
              公平時數排班
            </button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-wrap gap-4 items-end border border-gray-200">
        {user?.role === 'SUPER_ADMIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">門市 (Location)</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="rounded-lg border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">選擇門市...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開始日期 (Start Date)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">結束日期 (End Date)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <button
          onClick={fetchRosterData}
          className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          重新整理
        </button>

        <div className="flex-1"></div>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List className="w-4 h-4" />
            列表視圖
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <CalendarIcon className="w-4 h-4" />
            月曆視圖
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Printer className="w-4 h-4" />
          列印班表
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {/* Requirements Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">人力需求配置</h2>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{requirements.length} 筆</span>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">載入中...</div>
                ) : requirements.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">無人力需求設定</div>
                ) : (
                  <div className="space-y-3">
                    {requirements.map((req) => (
                      <div key={req.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center hover:border-primary-200 transition-colors">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{new Date(req.date).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500 mt-1">{req.jobRole?.name || '無指定'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-primary-700">{req.startTime} - {req.endTime}</div>
                          <div className="text-xs font-semibold text-gray-600 mt-1">需 {req.count} 人</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Shifts Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">已排定班表</h2>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium">{shifts.length} 個班次</span>
            </div>
            
            <div className="p-0 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-12 text-gray-400">載入中...</div>
              ) : combinedShifts.combined.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">目前沒有排班資料</h3>
                  <p className="text-sm text-gray-500 text-center max-w-sm">
                    點擊上方的「自動排班」按鈕，系統將會根據人力需求與員工可用時段自動為您排定班表。
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">員工</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">職位</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時段</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日別</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {combinedShifts.combined.map((shift) => (
                      <tr key={shift.id} className={`transition-colors ${shift.isShortage ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {new Date(shift.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${shift.isShortage ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>
                              {shift.isShortage ? '!' : shift.user?.name.charAt(0)}
                            </div>
                            <span className={`text-sm font-medium ${shift.isShortage ? 'text-red-700 font-bold' : 'text-gray-900'}`}>{shift.user?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {shift.jobRole?.name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                          {shift.startTime} - {shift.endTime}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            shift.dayType === 'WORKDAY' ? 'bg-green-100 text-green-800' :
                            shift.dayType === 'REST_DAY' ? 'bg-yellow-100 text-yellow-800' :
                            shift.dayType === 'NATIONAL_HOLIDAY' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {shift.dayType === 'WORKDAY' ? '工作日' : 
                             shift.dayType === 'REST_DAY' ? '休息日' : 
                             shift.dayType === 'NATIONAL_HOLIDAY' ? '國定假日' : '例假日'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : (
        renderCalendarView()
      )}

      {viewMode === 'calendar' && (
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              #printable-roster, #printable-roster * { visibility: visible; }
              #printable-roster { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
              /* Hide the sidebar and top navbar space for printing */
              #printable-roster { margin-top: -80px; margin-left: -256px; } 
            }
          `}
        </style>
      )}

        </div>
      </PageContent>
      <StaffRosterSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        locationId={selectedLocation}
      />
    </div>
  );
}
