import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface PayrollRecord {
  userId: string;
  name: string;
  hourlyWage: number;
  totalHours: number;
  totalSalary: number;
}

export default function AttendancePayroll() {
  const { t } = useTranslation();
  const { token } = useAuth();
  
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPayroll();
  }, [year, month]);

  async function fetchPayroll() {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/payroll?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPayrollData(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch payroll data');
      }
    } catch (err) {
      toast.error('System error occurred');
    } finally {
      setLoading(false);
    }
  }

  const handleExportCSV = () => {
    if (payrollData.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "員工姓名,時薪,總工時(小時),應付薪資\n";
    
    payrollData.forEach(row => {
      csvContent += `${row.name},${row.hourlyWage},${row.totalHours},${row.totalSalary}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payroll_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const totalStorePayroll = payrollData.reduce((acc, curr) => acc + curr.totalSalary, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">薪資結算報表</h2>
        <button
          onClick={handleExportCSV}
          disabled={payrollData.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50"
        >
          匯出 CSV
        </button>
      </div>

      <div className="bg-white p-6 rounded shadow mb-6 flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">年份</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded border-gray-300 border p-2"
          >
            {years.map(y => <option key={y} value={y}>{y} 年</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded border-gray-300 border p-2 min-w-[100px]"
          >
            {months.map(m => <option key={m} value={m}>{m} 月</option>)}
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-500 mb-1">當月總薪資支出</div>
          <div className="text-2xl font-bold text-blue-600">
            NT$ {totalStorePayroll.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">員工姓名</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">時薪</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">總工時 (小時)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">應付薪資</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : payrollData.length > 0 ? (
                payrollData.map((record) => (
                  <tr key={record.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      NT$ {record.hourlyWage.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-medium">
                      {record.totalHours} h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">
                      NT$ {record.totalSalary.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    此月份尚無任何員工的打卡結算紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
