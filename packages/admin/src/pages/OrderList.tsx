import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';

interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  total: number;
  createdAt: string;
  scheduledAt: string | null;
  customer: { id: string; name: string; email: string } | null;
  location: { id: string; name: string };
  _count: { items: number };
  isRemote?: boolean;
  distance?: number | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-200 text-green-900',
  PICKED_UP: 'bg-green-200 text-green-900',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrderList() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { user } = useAuth();
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('orderType', typeFilter);

    fetch(`/api/orders?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load orders');
        return res.json();
      })
      .then((data) => {
        setOrders(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter, typeFilter, token]);

  async function handleDelete(id: string) {
    if (!window.confirm('確定要刪除這筆訂單嗎？此操作無法復原。')) return;
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('刪除失敗');
      setOrders(orders.filter(o => o.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleExport() {
    const startDate = prompt('請輸入起始日期 (YYYY-MM-DD)', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const endDate = prompt('請輸入結束日期 (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);

    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/orders/export?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('匯出失敗');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await api.upload<{ data: { success: number, failed: number, errors: string[] } }>('/orders/import', formData);
      alert(`匯入完成！成功: ${res.data.success}, 失敗: ${res.data.failed}`);
      if (res.data.errors.length > 0) {
        console.error('Import errors:', res.data.errors);
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  }

  async function handleDownloadTemplate() {
    try {
      setLoading(true);
      const res = await fetch('/api/orders/template', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('下載失敗');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'order_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckReminders() {
    try {
      setLoading(true);
      const res = await fetch('/api/orders/reminders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminders');
      alert(`提醒已發送！\n${data.data.message}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/orders/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + 新增訂單
          </Link>
          {canManage && (
            <button
              onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              匯出報表 (Excel)
            </button>
          )}
          {canManage && (
            <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              匯入報表
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImport} />
            </label>
          )}
          {canManage && (
            <button
              onClick={handleDownloadTemplate}
              className="text-primary-600 hover:text-primary-700 text-xs font-medium"
            >
              下載範本
            </button>
          )}
          <button
            onClick={handleCheckReminders}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            🔔 狀態提醒
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="依狀態篩選"
        >
          <option value="">所有狀態</option>
          <option value="PENDING">待處理 (Pending)</option>
          <option value="CONFIRMED">已確認 (Confirmed)</option>
          <option value="PREPARING">製作中 (Preparing)</option>
          <option value="READY">可取餐 (Ready)</option>
          <option value="OUT_FOR_DELIVERY">外送中 (Out for Delivery)</option>
          <option value="DELIVERED">已送達 (Delivered)</option>
          <option value="PICKED_UP">已取餐 (Picked Up)</option>
          <option value="CANCELLED">已取消 (Cancelled)</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="依訂單類型篩選"
        >
          <option value="">所有類型</option>
          <option value="DELIVERY">外送 (Delivery)</option>
          <option value="PICKUP">自取 (Pickup)</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="載入中" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="text-gray-500 text-center py-12">{t('common.noResults')}</p>
      )}

      {!loading && orders.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.orderNumber')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.customer')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.type')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.items')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{t('orders.total')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.createdAt')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <div className="flex flex-col gap-1">
                        <span>{order.orderNumber}</span>
                        {order.isRemote !== undefined && (
                          <span className={`inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-bold ${order.isRemote ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {order.isRemote ? t('orders.remote') : t('orders.onSite')}
                            {order.distance != null && ` (${Math.round(order.distance)}m)`}
                          </span>
                        )}
                      </div>
                      {order.scheduledAt && (
                        <span className="mt-1 inline-flex items-center text-indigo-600" title={`Scheduled: ${new Date(order.scheduledAt).toLocaleString()}`} aria-label={`Scheduled: ${new Date(order.scheduledAt).toLocaleString()}`}>
                          &#128339;
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.customer ? order.customer.name : <span className="text-gray-400">{t('common.guest') || '訪客'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.orderType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                        {order.orderType === 'DELIVERY' ? '外送' : '自取'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status === 'PENDING' && '待處理'}
                        {order.status === 'CONFIRMED' && '已確認'}
                        {order.status === 'PREPARING' && '製作中'}
                        {order.status === 'READY' && '可取餐'}
                        {order.status === 'OUT_FOR_DELIVERY' && '外送中'}
                        {order.status === 'DELIVERED' && '已送達'}
                        {order.status === 'PICKED_UP' && '已取餐'}
                        {order.status === 'CANCELLED' && '已取消'}
                        {!['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(order.status) && order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order._count.items}</td>
                    <td className="px-4 py-3 text-right font-medium">${order.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          {t('common.view') || '查看'}
                        </Link>
                        {canManage && (
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium"
                          >
                            {t('common.delete') || '刪除'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                上一頁
              </button>
              <span className="text-sm text-gray-600">
                第 {pagination.page} 頁，共 {pagination.totalPages} 頁
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
