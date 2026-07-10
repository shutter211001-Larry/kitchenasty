import { useState, useEffect } from "react";
import { DollarSign, CheckCircle2, Clock, Search, Trash2, PieChart as PieChartIcon } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { confirm } from "../lib/confirm";

interface Expense {
  id: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  inventoryLog?: {
    id: string;
    amount: number;
    type: string;
    ingredient?: {
      name: string;
      unit: string;
    };
  };
}

interface AnalyticsData {
  dailyStats: { date: string; amount: number }[];
  statusDistribution: { status: string; count: number; total: number }[];
  categoryDistribution: { name: string; revenue: number; orders: number }[];
}

interface MetricsData {
  totalExpenses: number;
  totalPaid: number;
  totalPending: number;
}

export default function Expenses() {
  const [tab, setTab] = useState<'overview' | 'analytics'>('overview');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, PAID
  
  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsDays, setAnalyticsDays] = useState(30);

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [analyticsDays]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:3000/api/expenses");
      setExpenses(res.data);
    } catch (error) {
      toast.error("無法載入帳務紀錄");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await axios.get(`http://localhost:3000/api/expenses/analytics?days=${analyticsDays}`);
      setAnalytics(res.data.analytics);
      setMetrics(res.data.metrics);
    } catch (error) {
      console.error("Failed to load analytics", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await axios.patch(`http://localhost:3000/api/expenses/${id}/status`, { status: newStatus });
      
      if (res.status === 200 || res.status === 204) {
        toast.success(`狀態已更新為 ${newStatus === 'PAID' ? '已付款' : '未付款'}`);
        fetchExpenses();
        fetchAnalytics();
      } else {
        toast.error("更新失敗");
      }
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!await confirm("確定要刪除這筆帳款嗎？")) return;
    try {
      const res = await axios.delete(`http://localhost:3000/api/expenses/${id}`);
      if (res.status === 204 || res.status === 200) {
        toast.success("已成功刪除帳款");
        fetchExpenses();
        fetchAnalytics();
      }
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "ALL" || e.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalPending = metrics?.totalPending || expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = metrics?.totalPaid || expenses.filter(e => e.status === 'PAID').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = metrics?.totalExpenses || (totalPending + totalPaid);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" />
            帳務管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">追蹤庫存進貨應付帳款與支出</p>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1 shrink-0" role="tablist">
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'overview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
            role="tab"
          >
            總覽
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              tab === 'analytics' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
            role="tab"
          >
            <PieChartIcon className="w-4 h-4" />
            統計分析
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">未付款 (應付帳款)</p>
            <h3 className="text-2xl font-bold text-red-600">${totalPending.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">已付款總計</p>
            <h3 className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">總支出</p>
            <h3 className="text-2xl font-bold text-gray-900">${totalExpenses.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜尋描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'PENDING', 'PAID'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'ALL' ? '全部' : f === 'PENDING' ? '未付款' : '已付款'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-4 px-6 font-semibold text-gray-600 border-b border-gray-100">日期</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 border-b border-gray-100">描述</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 border-b border-gray-100 text-right">金額</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 border-b border-gray-100">狀態</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 border-b border-gray-100 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      沒有找到紀錄
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-gray-600">
                        {new Date(expense.createdAt).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="py-4 px-6 text-gray-900 font-medium">
                        {expense.description}
                      </td>
                      <td className="py-4 px-6 text-gray-900 font-bold text-right">
                        ${expense.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.status === 'PAID' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {expense.status === 'PAID' ? '已付款' : '未付款'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          {expense.status === 'PENDING' ? (
                            <button
                              onClick={() => handleUpdateStatus(expense.id, 'PAID')}
                              className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors"
                            >
                              核銷
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(expense.id, 'PENDING')}
                              className="px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors"
                            >
                              撤銷
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="刪除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setAnalyticsDays(d)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    analyticsDays === d ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {d}天
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !analytics ? (
            <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-gray-100 shadow-sm">
              尚無統計資料
            </div>
          ) : (
            <>
              {/* Daily Trend */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">每日支出趨勢</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dailyStats.map(d => ({ ...d, label: formatDate(d.date) }))}>
                      <defs>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '支出']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} 
                      />
                      <Area type="monotone" dataKey="amount" stroke="#ef4444" fill="url(#expenseGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">款項狀態分佈</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.statusDistribution.map(d => ({
                            name: d.status === 'PAID' ? '已付款' : '未付款',
                            value: d.total
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, value }) => `${name} ($${value.toLocaleString()})`}
                          labelLine={false}
                          dataKey="value"
                        >
                          {analytics.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.status === 'PAID' ? '#10b981' : '#ef4444'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, '總額']}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">進貨分類支出</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.categoryDistribution} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === 'revenue' ? `$${value.toLocaleString()}` : value,
                            name === 'revenue' ? '支出總額' : '進貨次數'
                          ]}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} name="revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
