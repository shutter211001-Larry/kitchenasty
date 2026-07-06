import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { api } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Play, CheckCircle, Clock } from 'lucide-react';

interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAID';
  locationId: string;
  _count: { payslips: number };
}

interface Payslip {
  id: string;
  userId: string;
  baseSalary: number;
  totalOvertime: number;
  totalAllowances: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
}

export default function PayrollDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      const [periodRes, payslipsRes] = await Promise.all([
        api.get<{ data: PayrollPeriod }>(`/payroll/periods/${id}`),
        api.get<{ data: Payslip[] }>(`/payroll/periods/${id}/payslips`)
      ]);
      setPeriod(periodRes.data);
      setPayslips(payslipsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll details');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!window.confirm('確定要產生薪資單嗎？這將會覆蓋目前草稿狀態的薪資單。 (Are you sure? This will overwrite existing draft payslips for this period.)')) return;
    
    try {
      setGenerating(true);
      setError('');
      await api.post<{ data: any }>(`/payroll/periods/${id}/generate`, {});
      // Re-fetch data after generation
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!period) {
    return <div className="p-4 bg-red-50 text-red-700 rounded-lg">Payroll period not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <PageHeader
        title={period.name}
        backUrl="/payroll"
        backText="返回列表 (Back to List)"
        action={
          period.status !== 'PAID' && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Play size={16} />
              {generating ? '結算中...' : '執行薪資結算 (Generate Payslips)'}
            </button>
          )
        }
      />

      <PageContent>
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">期間 (Period)</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">狀態 (Status)</p>
            <div className="flex items-center gap-2">
              {period.status === 'DRAFT' && <Clock size={18} className="text-yellow-500" />}
              {period.status === 'PUBLISHED' && <CheckCircle size={18} className="text-blue-500" />}
              {period.status === 'PAID' && <CheckCircle size={18} className="text-green-500" />}
              <p className="text-lg font-semibold text-gray-900">{period.status}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">員工數 (Employees)</p>
            <p className="text-2xl font-bold text-gray-900">{payslips.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">總發放金額 (Total Net Pay)</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatCurrency(payslips.reduce((acc, p) => acc + p.netPay, 0))}
            </p>
          </div>
        </div>

        {/* Payslips Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">員工薪資明細 (Payslips)</h3>
          </div>
          
          {payslips.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">尚未產生薪資單</h3>
              <p className="text-gray-500 mb-6">點擊右上角的「執行薪資結算」來為員工計算薪資。</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">員工 (Employee)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">基本底薪 (Base Pay)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">加班費 (Overtime)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">扣除額 (Deductions)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">實發薪資 (Net Pay)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">操作 (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payslips.map(payslip => (
                  <tr key={payslip.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{payslip.user.name}</p>
                      <p className="text-xs text-gray-500">{payslip.user.email}</p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                      {formatCurrency(payslip.baseSalary)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                      {payslip.totalOvertime > 0 ? (
                        <span className="text-green-600">+{formatCurrency(payslip.totalOvertime)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                      {payslip.totalDeductions > 0 ? (
                        <span className="text-red-600">-{formatCurrency(payslip.totalDeductions)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(payslip.netPay)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                        明細 (View)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageContent>
    </div>
  );
}
