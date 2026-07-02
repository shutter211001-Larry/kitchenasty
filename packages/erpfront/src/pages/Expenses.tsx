import { useState, useEffect } from "react";
import { DollarSign, CheckCircle2, Clock, Search, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import axios from "axios";

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

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, PAID

  useEffect(() => {
    fetchExpenses();
  }, []);

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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await axios.patch(`http://localhost:3000/api/expenses/${id}/status`, { status: newStatus });
      
      if (res.status === 200 || res.status === 204) {
        toast.success(`狀態已更新為 ${newStatus === 'PAID' ? '已付款' : '未付款'}`);
        fetchExpenses();
      } else {
        toast.error("更新失敗");
      }
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("確定要刪除這筆帳款嗎？")) return;
    try {
      const res = await axios.delete(`http://localhost:3000/api/expenses/${id}`);
      if (res.status === 204 || res.status === 200) {
        toast.success("已成功刪除帳款");
        fetchExpenses();
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

  const totalPending = expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.filter(e => e.status === 'PAID').reduce((sum, e) => sum + e.amount, 0);

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">未付款 (應付帳款)</p>
            <h3 className="text-2xl font-bold text-red-600">${totalPending.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">已付款總計</p>
            <h3 className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

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
                    載入中...
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
                      {new Date(expense.createdAt).toLocaleDateString()}
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
                            核銷 (標記為已付款)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(expense.id, 'PENDING')}
                            className="px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            撤銷核銷
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
    </div>
  );
}
