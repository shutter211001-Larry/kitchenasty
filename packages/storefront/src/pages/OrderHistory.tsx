import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useRecentOrders } from '../hooks/useRecentOrders.js';
import { API_BASE } from '../lib/api.js';

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  total: number;
  createdAt: string;
  location: { id: string; name: string };
  _count: { items: number };
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
  HISTORY: 'bg-gray-100 text-gray-800',
};

function getStatusTranslationKey(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'placed';
    case 'CONFIRMED': return 'confirmed';
    case 'PREPARING': return 'preparing';
    case 'READY': return 'ready';
    case 'OUT_FOR_DELIVERY': return 'outForDelivery';
    case 'DELIVERED': return 'delivered';
    case 'PICKED_UP': return 'pickedUp';
    case 'CANCELLED': return 'cancelled';
    default: return status.toLowerCase();
  }
}

export default function OrderHistory() {
  const { t } = useTranslation();
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const { settings } = useTheme();
  const { recentOrders } = useRecentOrders();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // Lookup state
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupNumber, setLookupNumber] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const { addOrder } = useRecentOrders();

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError('');
    try {
      const num = lookupNumber.startsWith('#') ? lookupNumber : `#${lookupNumber}`;
      const res = await fetch(`${API_BASE}/orders/lookup?email=${encodeURIComponent(lookupEmail)}&orderNumber=${encodeURIComponent(num)}`);
      const data = await res.json();
      if (data.success && data.data) {
        // Add to local history
        addOrder({
          id: data.data.id,
          orderNumber: data.data.orderNumber,
          date: data.data.createdAt,
          total: data.data.total,
          orderType: data.data.orderType
        });
        // Redirect
        window.location.href = `/orders/${data.data.id}`;
      } else {
        setLookupError(t('orders.lookupError'));
      }
    } catch (err) {
      setLookupError(t('orders.lookupServerError'));
    } finally {
      setLookupLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Load from cache first
    const cached = localStorage.getItem(`orders_cache_${page}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setOrders(parsed.data);
        setPagination(parsed.pagination);
        setLoading(false);
      } catch (e) { }
    }

    setLoading(true);
    fetch(`${API_BASE}/orders/my-orders?page=${page}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          logout();
          throw new Error('UNAUTHORIZED_SILENT');
        }
        if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
        return res.json();
      })
      .then((data) => {
        setOrders(data.data);
        setPagination(data.pagination);
        // Save to cache
        localStorage.setItem(`orders_cache_${page}`, JSON.stringify(data));
      })
      .catch((err) => {
        if (err.message === 'UNAUTHORIZED_SILENT') return;
        console.error('Order fetch failed:', err);
        // Only show error if we have NO orders to display (including cache)
        if (!orders.length) {
          setError(t('orders.errorLoading'));
        }
      })
      .finally(() => setLoading(false));
  }, [token, page, t]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const displayOrders = user ? orders : (recentOrders as any[]).map(ro => ({
    id: ro.id,
    orderNumber: ro.orderNumber,
    status: 'HISTORY',
    total: ro.total || 0,
    orderType: ro.orderType || 'PICKUP',
    createdAt: ro.date,
    location: { name: t('orders.recentGuestOrders') },
    _count: { items: ro.itemCount || 0 }
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-main">
            {user ? t('orders.title') : t('orders.recentGuestOrders')}
          </h1>
          {!user && (
            <p className="text-sm text-sub mt-1">
              {t('orders.recentGuestOrdersDesc')}
            </p>
          )}
        </div>
        {user && settings.showMembership && (
          <Link to="/account" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            {t('nav.myAccount')}
          </Link>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50/10 border border-red-200/20 text-red-600 p-4 rounded-lg mb-4">{error}</div>
      )}

      {!loading && !error && displayOrders.length === 0 && (
        <div className="text-center py-12 surface-card rounded-xl border shadow-sm mb-8">
          <svg className="w-12 h-12 text-hint mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sub mb-4">{t('orders.noOrders')}</p>
          {settings.navShowMenu && (
            <Link to="/menu" className="btn-primary px-6 py-2">
              {t('checkout.browseMenu')}
            </Link>
          )}
        </div>
      )}

      {/* Find Order Form */}
      <div className="surface-brand rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold mb-2">{t('orders.findOrderTitle')}</h2>
        <p className="text-sm opacity-90 mb-4">{t('orders.findOrderDesc')}</p>
        <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="email"
            placeholder={t('orders.lookupEmail')}
            required
            value={lookupEmail}
            onChange={(e) => setLookupEmail(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:ring-2 focus:ring-white/50 outline-none placeholder:text-white/50 text-white"
          />
          <input
            type="text"
            placeholder={t('orders.lookupNumber')}
            required
            value={lookupNumber}
            onChange={(e) => setLookupNumber(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:ring-2 focus:ring-white/50 outline-none placeholder:text-white/50 text-white"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="bg-white text-primary-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {lookupLoading ? t('orders.lookupSearching') : t('orders.lookupSubmit')}
          </button>
        </form>
        {lookupError && <p className="text-xs text-white mt-2">{lookupError}</p>}
      </div>

      {!loading && displayOrders.length > 0 && (
        <>
          <div className="space-y-4">
            {displayOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block surface-card rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-main">#{order.orderNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                      {t(`orderStatus.${getStatusTranslationKey(order.status)}`)}
                    </span>
                  </div>
                  <span className="font-bold text-primary-600">${order.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-sub">
                  <span>{order.location.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.orderType === 'DELIVERY' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                    {order.orderType}
                  </span>
                  <span>{order._count.items} item{order._count.items !== 1 ? 's' : ''}</span>
                  <span className="ml-auto">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 text-sm border border-input rounded-lg disabled:opacity-40 hover:bg-surface text-main"
              >
                {t('locations.previous')}
              </button>
              <span className="text-sm text-sub">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 text-sm border border-input rounded-lg disabled:opacity-40 hover:bg-surface text-main"
              >
                {t('locations.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
