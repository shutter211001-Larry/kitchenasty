import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  comment: string | null;
  options: { id: string; name: string; value: string; priceModifier: number }[];
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  comment: string | null;
  scheduledAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  location: { id: string; name: string };
  table?: { id: string; name: string } | null;
  items: OrderItem[];
  isRemote?: boolean;
  distance?: number | null;
  paymentStatus?: string | null;
}

const STATUSES = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED',
];

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

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [adjustedTotalInput, setAdjustedTotalInput] = useState('');
  const [currencyDecimals, setCurrencyDecimals] = useState(2);
  const { user } = useAuth();
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load order');
        return res.json();
      })
      .then((data) => {
        setOrder(data.data);
        const decimals = data.currencyDecimals !== undefined ? data.currencyDecimals : 2;
        setCurrencyDecimals(decimals);
        if (data.data) {
          const unrounded = data.data.subtotal + data.data.tax + data.data.deliveryFee - data.data.discount;
          const roundedTotal = Number(unrounded.toFixed(decimals));
          setAdjustedTotalInput(roundedTotal.toString());
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function updatePaymentStatus(newPaymentStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/payment-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus: newPaymentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder((prev) => prev ? { ...prev, paymentStatus: newPaymentStatus } : prev);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpdateDiscount() {
    const val = Number(adjustedTotalInput);
    if (isNaN(val) || val < 0) {
      alert(t('autoGen.admin.key1007'));
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/discount`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adjustedTotal: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('autoGen.admin.key1008'));
      setOrder((prev) => prev ? { ...prev, ...data.data } : data.data);
      const unrounded = data.data.subtotal + data.data.tax + data.data.deliveryFee - data.data.discount;
      const roundedTotal = Number(unrounded.toFixed(currencyDecimals));
      setAdjustedTotalInput(roundedTotal.toString());
      alert(t('autoGen.admin.key1009'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('autoGen.admin.key1010'))) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('autoGen.admin.key1011'));
      window.location.href = '/orders';
    } catch (err: any) {
      setError(err.message);
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label={t('autoGen.admin.key1012')} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error || 'Order not found'}</div>
        <Link to="/orders" className="text-primary-600 hover:text-primary-700 text-sm">
          {t('orders.backToOrders')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/orders" className="text-gray-400 hover:text-gray-600" aria-label={t('autoGen.admin.key1013')}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('autoGen.admin.key1014')}{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            {t('autoGen.admin.key1015')}{new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`ml-auto text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
          {order.status === 'PENDING' && t('autoGen.admin.key1016')}
          {order.status === 'CONFIRMED' && t('autoGen.admin.key1017')}
          {order.status === 'PREPARING' && t('autoGen.admin.key1018')}
          {order.status === 'READY' && t('autoGen.admin.key1019')}
          {order.status === 'OUT_FOR_DELIVERY' && t('autoGen.admin.key1020')}
          {order.status === 'DELIVERED' && t('autoGen.admin.key1021')}
          {order.status === 'PICKED_UP' && t('autoGen.admin.key1022')}
          {order.status === 'CANCELLED' && t('autoGen.admin.key1023')}
          {!['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(order.status) && order.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.items')}</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">
                      <span className="text-gray-400 mr-1">{item.quantity}x</span>
                      {item.name}
                    </div>
                    {item.options.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                      </div>
                    )}
                    {item.comment && (
                      <div className="text-xs text-gray-400 mt-0.5 italic">{t('autoGen.admin.key1024')} {item.comment}</div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.subtotal')}</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders.tax')}</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
              )}
              {(order.orderType === 'DELIVERY' || order.orderType === 'FROZEN_DELIVERY') && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders.deliveryFee')}</span>
                  <span className={order.deliveryFee === 0 ? "text-green-600 font-medium" : ""}>
                    {order.deliveryFee === 0 ? (t('orders.free') || t('autoGen.admin.key1025')) : `$${order.deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('orders.discount')}</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              {(() => {
                const unrounded = order.subtotal + order.tax + order.deliveryFee - order.discount;
                const diff = order.total - unrounded;
                if (Math.abs(diff) > 0.001) {
                  return (
                    <div className="flex justify-between text-gray-500">
                      <span>{t('autoGen.admin.key1026')}</span>
                      <span>{diff > 0 ? '+' : ''}${diff.toFixed(2)}</span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                <span>{t('orders.total')}</span>
                <span className="text-primary-600">${order.total}</span>
              </div>

              {canManage && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="adjustedPriceInput" className="text-xs font-semibold text-gray-500">
                      {t('autoGen.admin.key1027')}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          id="adjustedPriceInput"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t('autoGen.admin.key1028')}
                          value={adjustedTotalInput}
                          onChange={(e) => setAdjustedTotalInput(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        onClick={handleUpdateDiscount}
                        disabled={updating}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {t('autoGen.admin.key1029')}
                      </button>
                    </div>
                    {adjustedTotalInput && !isNaN(Number(adjustedTotalInput)) && (
                      <span className="text-xs text-gray-400 mt-1">
                        {t('autoGen.admin.key1030')}{(Math.max(0, (order.subtotal + order.tax + order.deliveryFee) - Number(adjustedTotalInput))).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.comment && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('checkout.orderNotes') || t('autoGen.admin.key1031')}</h2>
              <p className="text-gray-600 text-sm">{order.comment}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status update */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('autoGen.admin.key1032')}</h2>
            <div className="space-y-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  disabled={updating || order.status === status}
                  onClick={() => updateStatus(status)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${order.status === status
                      ? STATUS_COLORS[status] + ' cursor-default'
                      : 'text-gray-600 hover:bg-gray-100 disabled:opacity-40'
                    }`}
                  aria-label={`將狀態設為 ${status.replace(/_/g, ' ')}`}
                >
                  {status === 'PENDING' && t('autoGen.admin.key1033')}
                  {status === 'CONFIRMED' && t('autoGen.admin.key1034')}
                  {status === 'PREPARING' && t('autoGen.admin.key1035')}
                  {status === 'READY' && t('autoGen.admin.key1036')}
                  {status === 'OUT_FOR_DELIVERY' && t('autoGen.admin.key1037')}
                  {status === 'DELIVERED' && t('autoGen.admin.key1038')}
                  {status === 'PICKED_UP' && t('autoGen.admin.key1039')}
                  {status === 'CANCELLED' && t('autoGen.admin.key1040')}
                  {!['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(status) && status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Payment status update */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 font-sans">{t('autoGen.admin.key1041')}</h2>
            <div className="flex gap-2">
              <button
                disabled={updating || order.paymentStatus === 'PAID'}
                onClick={() => updatePaymentStatus('PAID')}
                className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold transition-all border ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-800 font-bold cursor-default'
                    : 'bg-gray-50 border-gray-250 text-gray-600 hover:bg-gray-100 active:scale-95'
                }`}
              >
                {t('autoGen.admin.key1042')}
              </button>
              <button
                disabled={updating || (!order.paymentStatus || order.paymentStatus === 'UNPAID')}
                onClick={() => updatePaymentStatus('UNPAID')}
                className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold transition-all border ${
                  (!order.paymentStatus || order.paymentStatus === 'UNPAID')
                    ? 'bg-rose-100 border-rose-200 text-rose-800 font-bold cursor-default'
                    : 'bg-gray-50 border-gray-250 text-gray-600 hover:bg-gray-100 active:scale-95'
                }`}
              >
                {t('autoGen.admin.key1043')}
              </button>
            </div>
          </div>

          {/* Delete Action */}
          {canManage && (
            <div className="bg-red-50 rounded-xl border border-red-100 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-red-900 mb-2">{t('autoGen.admin.key1044')}</h2>
              <p className="text-xs text-red-600 mb-4">{t('autoGen.admin.key1045')}</p>
              <button
                disabled={updating}
                onClick={handleDelete}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {t('autoGen.admin.key1046')}
              </button>
            </div>
          )}

          {/* Order info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.orderDetail')}</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">{t('orders.type')}</dt>
                <dd className="font-medium text-gray-900 flex items-center gap-2">
                  <span>{order.orderType}</span>
                  {order.table && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {t('autoGen.admin.key1047')} {order.table.name}
                    </span>
                  )}
                </dd>
              </div>
              {order.isRemote !== undefined && (
                <div>
                  <dt className="text-gray-500">{t('orders.remote') || t('autoGen.admin.key1048')}</dt>
                  <dd className="font-medium">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${order.isRemote ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {order.isRemote ? t('orders.remote') : t('orders.onSite')}
                      {order.distance != null && ` (${Math.round(order.distance)}m)`}
                    </span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">{t('reservations.location') || t('autoGen.admin.key1049')}</dt>
                <dd className="font-medium text-gray-900">{order.location.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t('orders.customer')}</dt>
                <dd className="font-medium text-gray-900">
                  {order.customer ? (
                    <>
                      {order.customer.name}
                      <span className="block text-xs text-gray-400">{order.customer.email}</span>
                      {order.customer.phone && (
                        <span className="block text-xs text-gray-400">{order.customer.phone}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">{t('common.guest') || t('autoGen.admin.key1050')}</span>
                  )}
                </dd>
              </div>
              {order.scheduledAt && (
                <div>
                  <dt className="text-gray-500">{t('autoGen.admin.key1051')}</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(order.scheduledAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
