import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Search, Calendar, Users, DollarSign } from 'lucide-react';

interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAID';
  locationId: string;
  _count: { payslips: number };
}

export default function PayrollManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  async function fetchPeriods() {
    try {
      setLoading(true);
      const res = await api.get<{ data: PayrollPeriod[] }>('/payroll/periods');
      setPeriods(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll periods');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePeriod(e: React.FormEvent) {
    e.preventDefault();
    if (!newPeriodName || !newPeriodStart || !newPeriodEnd) return;
    
    try {
      setCreating(true);
      const res = await api.post<{ data: PayrollPeriod }>('/payroll/periods', {
        name: newPeriodName,
        startDate: new Date(newPeriodStart).toISOString(),
        endDate: new Date(newPeriodEnd).toISOString(),
        locationId: user?.locationId || 'default', // In a real app, let user select or fallback
      });
      
      setPeriods([res.data, ...periods]);
      setShowCreateModal(false);
      setNewPeriodName('');
      setNewPeriodStart('');
      setNewPeriodEnd('');
      
      // Navigate to detail page
      navigate(`/payroll/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create period');
    } finally {
      setCreating(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'DRAFT': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">草稿 (Draft)</span>;
      case 'PUBLISHED': return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">已發布 (Published)</span>;
      case 'PAID': return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">已發放 (Paid)</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <PageHeader
        title="薪資結算管理 (Payroll Management)"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            建立結算週期 (New Period)
          </button>
        }
      />

      <PageContent>
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">尚無結算週期</h3>
              <p className="text-gray-500 mb-6">點擊右上方按鈕建立第一個薪資結算週期。</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">週期名稱 (Name)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">期間 (Period)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">狀態 (Status)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">已產生薪資單 (Payslips)</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">操作 (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {periods.map(period => (
                  <tr key={period.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{period.name}</p>
                          <p className="text-xs text-gray-500">ID: {period.id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(period.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
                        <Users size={14} className="text-gray-400" />
                        {period._count.payslips}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/payroll/${period.id}`)}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        檢視與結算 (View)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageContent>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">建立薪資結算週期</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">週期名稱 (Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="例: 2026年7月薪資"
                  value={newPeriodName}
                  onChange={e => setNewPeriodName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始日期 (Start) *</label>
                  <input
                    type="date"
                    required
                    value={newPeriodStart}
                    onChange={e => setNewPeriodStart(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">結束日期 (End) *</label>
                  <input
                    type="date"
                    required
                    value={newPeriodEnd}
                    onChange={e => setNewPeriodEnd(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  取消 (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {creating ? '建立中...' : '建立 (Create)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
