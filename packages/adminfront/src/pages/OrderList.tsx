import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

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
  table?: { id: string; name: string } | null;
  _count: { items: number };
  isRemote?: boolean;
  distance?: number | null;
  paymentStatus?: string | null;
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTimeoutId, setDeleteTimeoutId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { user } = useAuth();
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const token = localStorage.getItem('token') || '';

  async function togglePaymentStatus(id: string, currentStatus: string | null | undefined) {
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      const res = await fetch(`/api/orders/${id}/payment-status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ paymentStatus: nextStatus })
      });
      if (!res.ok) throw new Error(t('orderList.updatePaymentStatusFailed'));
      setOrders(orders.map(o => o.id === id ? { ...o, paymentStatus: nextStatus } : o));
    } catch (err: any) {
      setError(err.message);
    }
  }

  const [currencyDecimals, setCurrencyDecimals] = useState(2);

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
        if (data.currencyDecimals !== undefined) setCurrencyDecimals(data.currencyDecimals);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter, typeFilter, token]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutId) window.clearTimeout(deleteTimeoutId);
    };
  }, [deleteTimeoutId]);

  async function handleDeleteClick(id: string) {
    if (deleteConfirmId === id) {
      if (deleteTimeoutId) {
        window.clearTimeout(deleteTimeoutId);
        setDeleteTimeoutId(null);
      }
      setDeleteConfirmId(null);
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(t('orderList.deleteFailed'));
        setOrders(orders.filter(o => o.id !== id));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setDeleteConfirmId(id);
      const timeout = window.setTimeout(() => {
        setDeleteConfirmId(null);
      }, 3000);
      if (deleteTimeoutId) {
        window.clearTimeout(deleteTimeoutId);
      }
      setDeleteTimeoutId(timeout);
    }
  }

  async function handleExport() {
    const startDate = prompt(t('orderList.enterStartDate'), new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const endDate = prompt(t('orderList.enterEndDate'), new Date().toISOString().split('T')[0]);

    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/orders/export?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('orderList.exportFailed'));
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
      if (!res.ok) throw new Error(t('orderList.downloadFailed'));
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
    <div className="pb-12">
      <PageHeader
        title={t('orders.title')}
        action={
          <div className="w-full sm:w-auto flex flex-col gap-2">
            {/* Main Action on mobile: Full width */}
            <Link
              to="/orders/new"
              className="bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('orderList.addOrder')}
            </Link>

            {/* Secondary Actions on mobile: 2x2 Grid */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 w-full sm:w-auto">
              {canManage && (
                <button
                  onClick={handleExport}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto text-center shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('orderList.exportReport')}
                </button>
              )}
              {canManage && (
                <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto mb-0 text-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('orderList.importReport')}
                  <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImport} />
                </label>
              )}
              {canManage && (
                <button
                  onClick={handleDownloadTemplate}
                  className="text-primary-600 hover:text-primary-705 text-xs font-semibold py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 w-full sm:w-auto text-center sm:bg-transparent sm:border-none sm:p-0 transition-colors shadow-sm sm:shadow-none"
                >
                  {t('orderList.downloadTemplate')}
                </button>
              )}
              <button
                onClick={handleCheckReminders}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto text-center shadow-sm"
              >
                {t('orderList.statusReminder')}
              </button>
            </div>
          </div>
        }
      />

      <PageContent>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm transition-all duration-200"
          aria-label={t('orderList.filterByStatus')}
        >
          <option value="">{t('orderList.allStatuses')}</option>
          <option value="PENDING">{t('orderList.statusPending')}</option>
          <option value="CONFIRMED">{t('orderList.statusConfirmed')}</option>
          <option value="PREPARING">{t('orderList.statusPreparing')}</option>
          <option value="READY">{t('orderList.statusReady')}</option>
          <option value="OUT_FOR_DELIVERY">{t('orderList.statusOutForDelivery')}</option>
          <option value="DELIVERED">{t('orderList.statusDelivered')}</option>
          <option value="PICKED_UP">{t('orderList.statusPickedUp')}</option>
          <option value="CANCELLED">{t('orderList.statusCancelled')}</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm transition-all duration-200"
          aria-label={t('orderList.filterByOrderType')}
        >
          <option value="">{t('orderList.allTypes')}</option>
          <option value="DELIVERY">{t('orderList.typeDelivery')}</option>
          <option value="PICKUP">{t('orderList.typePickup')}</option>
          <option value="FROZEN_DELIVERY">{t('orderList.typeFrozenDelivery')}</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label={t('orderList.loading')} />
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
          {/* Desktop view: Table */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.orderNumber')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.customer')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.type')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orderList.checkoutStatus')}</th>
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
                        {order.table && (
                          <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {t('orderList.dineInTableNumber')} {order.table.name}
                          </span>
                        )}
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
                      {order.customer ? order.customer.name : <span className="text-gray-400">{t('common.guest') || t('orderList.guest')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.orderType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : order.orderType === 'FROZEN_DELIVERY' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                        }`}>
                        {order.orderType === 'DELIVERY' ? t('orderList.delivery') : order.orderType === 'FROZEN_DELIVERY' ? t('orderList.frozenDelivery') : t('orderList.pickup')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status === 'PENDING' && t('orderList.pending')}
                        {order.status === 'CONFIRMED' && t('orderList.confirmed')}
                        {order.status === 'PREPARING' && t('orderList.preparing')}
                        {order.status === 'READY' && t('orderList.ready')}
                        {order.status === 'OUT_FOR_DELIVERY' && t('orderList.outForDelivery')}
                        {order.status === 'DELIVERED' && t('orderList.delivered')}
                        {order.status === 'PICKED_UP' && t('orderList.pickedUp')}
                        {order.status === 'CANCELLED' && t('orderList.cancelled')}
                        {!['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(order.status) && order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePaymentStatus(order.id, order.paymentStatus)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all active:scale-95 ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200'
                        }`}
                        title={t('orderList.clickToToggleCheckout')}
                      >
                        {order.paymentStatus === 'PAID' ? t('orderList.checkedOut') : t('orderList.uncheckedOut')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order._count.items}</td>
                    <td className="px-4 py-3 text-right font-medium">${order.total}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          {t('common.view') || t('orderList.view')}
                        </Link>
                        {canManage && (
                          <button
                            onClick={() => handleDeleteClick(order.id)}
                            className={`text-xs font-bold transition-all ${
                              deleteConfirmId === order.id
                                ? 'text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-200 animate-pulse'
                                : 'text-red-600 hover:text-red-700'
                            }`}
                          >
                            {deleteConfirmId === order.id ? t('orderList.confirmDelete') : (t('common.delete') || t('orderList.delete'))}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view: Card List */}
          <div className="md:hidden space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs text-gray-500 font-semibold flex items-center gap-2">
                      #{order.orderNumber}
                      {order.table && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {t('orderList.tableNumber')} {order.table.name}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {order.customer ? order.customer.name : <span className="text-gray-400 font-normal">{t('common.guest') || t('orderList.guest')}</span>}
                    </span>
                    {order.scheduledAt && (
                      <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                        🕒 {new Date(order.scheduledAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status === 'PENDING' && t('orderList.pending')}
                    {order.status === 'CONFIRMED' && t('orderList.confirmed')}
                    {order.status === 'PREPARING' && t('orderList.preparing')}
                    {order.status === 'READY' && t('orderList.ready')}
                    {order.status === 'OUT_FOR_DELIVERY' && t('orderList.delivering')}
                    {order.status === 'DELIVERED' && t('orderList.delivered')}
                    {order.status === 'PICKED_UP' && t('orderList.pickedUp')}
                    {order.status === 'CANCELLED' && t('orderList.cancelled')}
                    {!['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(order.status) && order.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 pt-2.5 border-t border-gray-100">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${order.orderType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : order.orderType === 'FROZEN_DELIVERY' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {order.orderType === 'DELIVERY' ? t('orderList.delivery') : order.orderType === 'FROZEN_DELIVERY' ? t('orderList.frozenDelivery') : t('orderList.selfPickup')}
                  </span>
                  <span className="font-extrabold text-primary-600 text-sm">${order.total}</span>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 gap-2">
                  <button
                    onClick={() => togglePaymentStatus(order.id, order.paymentStatus)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-full font-bold transition-all active:scale-95 border ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {order.paymentStatus === 'PAID' ? t('orderList.paid') : t('orderList.unpaid')}
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-100 transition-all"
                    >
                      {t('common.view') || t('orderList.view')}
                    </Link>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteClick(order.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all border ${
                          deleteConfirmId === order.id
                            ? 'bg-red-600 border-transparent text-white animate-pulse shadow-sm'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {deleteConfirmId === order.id ? t('orderList.confirmDelete') : (t('common.delete') || t('orderList.delete'))}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t('orderList.previousPage')}
              </button>
              <span className="text-sm text-gray-600">
                {t('orderList.pagePrefix')} {pagination.page} {t('orderList.pageOfTotal')} {pagination.totalPages} {t('orderList.pageSuffix')}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t('orderList.nextPage')}
              </button>
            </div>
          )}
        </>
      )}
      </PageContent>
    </div>
  );
}
