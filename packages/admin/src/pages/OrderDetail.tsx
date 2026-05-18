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
  items: OrderItem[];
  isRemote?: boolean;
  distance?: number | null;
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
        if (data.data) {
          setAdjustedTotalInput(data.data.total.toString());
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

  async function handleUpdateDiscount() {
    const val = Number(adjustedTotalInput);
    if (isNaN(val) || val < 0) {
      alert('請輸入有效的折讓後價格！');
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
      if (!res.ok) throw new Error(data.error || '調整折讓失敗');
      setOrder((prev) => prev ? { ...prev, ...data.data } : data.data);
      setAdjustedTotalInput(data.data.total.toString());
      alert('折讓價格套用成功！');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('確定要刪除這筆訂單嗎？此操作無法復原。')) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('刪除失敗');
      window.location.href = '/orders';
    } catch (err: any) {
      setError(err.message);
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="載入中" />
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
        <Link to="/orders" className="text-gray-400 hover:text-gray-600" aria-label="返回訂單列表">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">訂單詳情 #{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            下單時間：{new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`ml-auto text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
                      <div className="text-xs text-gray-400 mt-0.5 italic">備註: {item.comment}</div>
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
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.tax')}</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders.deliveryFee')}</span>
                  <span>${order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('orders.discount')}</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                <span>{t('orders.total')}</span>
                <span className="text-primary-600">${order.total.toFixed(2)}</span>
              </div>

              {canManage && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="adjustedPriceInput" className="text-xs font-semibold text-gray-500">
                      設定折讓後價格
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          id="adjustedPriceInput"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="請輸入折讓後的價格"
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
                        套用
                      </button>
                    </div>
                    {adjustedTotalInput && !isNaN(Number(adjustedTotalInput)) && (
                      <span className="text-xs text-gray-400 mt-1">
                        預計折讓金額為: ${(Math.max(0, (order.subtotal + order.tax + order.deliveryFee) - Number(adjustedTotalInput))).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.comment && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('checkout.orderNotes') || '訂單備註'}</h2>
              <p className="text-gray-600 text-sm">{order.comment}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status update */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">更新訂單狀態</h2>
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
                  {status === 'PENDING' && '待處理 (Pending)'}
                  {status === 'CONFIRMED' && '已確認 (Confirmed)'}
                  {status === 'PREPARING' && '製作中 (Preparing)'}
                  {status === 'READY' && '可取餐 (Ready)'}
                  {status === 'OUT_FOR_DELIVERY' && '外送中 (Out for Delivery)'}
                  {status === 'DELIVERED' && '已送達 (Delivered)'}
                  {status === 'PICKED_UP' && '已取餐 (Picked Up)'}
                  {status === 'CANCELLED' && '已取消 (Cancelled)'}
                  {!['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(status) && status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Delete Action */}
          {canManage && (
            <div className="bg-red-50 rounded-xl border border-red-100 p-6">
              <h2 className="text-lg font-semibold text-red-900 mb-2">危險區域</h2>
              <p className="text-xs text-red-600 mb-4">刪除訂單後將無法復原，請謹慎操作。</p>
              <button
                disabled={updating}
                onClick={handleDelete}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                刪除訂單
              </button>
            </div>
          )}

          {/* Order info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.orderDetail')}</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">{t('orders.type')}</dt>
                <dd className="font-medium text-gray-900">{order.orderType}</dd>
              </div>
              {order.isRemote !== undefined && (
                <div>
                  <dt className="text-gray-500">{t('orders.remote') || '遠端/現場'}</dt>
                  <dd className="font-medium">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${order.isRemote ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {order.isRemote ? t('orders.remote') : t('orders.onSite')}
                      {order.distance != null && ` (${Math.round(order.distance)}m)`}
                    </span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">{t('reservations.location') || '地點'}</dt>
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
                    <span className="text-gray-400">{t('common.guest') || '訪客'}</span>
                  )}
                </dd>
              </div>
              {order.scheduledAt && (
                <div>
                  <dt className="text-gray-500">預約取餐/送達時間</dt>
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
