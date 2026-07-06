import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

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
      alert('自動排班完成！');
      fetchRosterData();
    } catch (err) {
      console.error(err);
      alert('自動排班失敗，請確認是否已設定門市需求與員工可用時段。');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-3xl">📅</span>
          排班管理與自動排班 (Roster Management)
        </h1>
        
        <div className="flex gap-2">
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
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-8 flex flex-wrap gap-4 items-end border border-gray-100">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Requirements Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">已排定班表</h2>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium">{shifts.length} 個班次</span>
            </div>
            
            <div className="p-0 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-12 text-gray-400">載入中...</div>
              ) : shifts.length === 0 ? (
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
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {new Date(shift.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                              {shift.user?.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{shift.user?.name}</span>
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
    </div>
  );
}
