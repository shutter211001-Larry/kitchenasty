import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  comment: string | null;
  options: { name: string; value: string }[];
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  pickupNumber?: string;
  orderType: string;
  status: string;
  comment: string | null;
  createdAt: string;
  scheduledAt: string | null;
  customer: { name: string; phone?: string; email?: string } | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  items: OrderItem[];
  isRemote?: boolean;
}

const KITCHEN_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string | null }> = {
  PENDING: { label: '新訂單 (New)', color: 'text-yellow-800', bg: 'bg-yellow-50 border-yellow-300', next: 'CONFIRMED' },
  CONFIRMED: { label: '已確認 (Confirmed)', color: 'text-blue-800', bg: 'bg-blue-50 border-blue-300', next: 'PREPARING' },
  PREPARING: { label: '製作中 (Preparing)', color: 'text-purple-800', bg: 'bg-purple-50 border-purple-300', next: 'READY' },
  READY: { label: '待取餐 (Ready)', color: 'text-green-800', bg: 'bg-green-50 border-green-300', next: null },
};

const NEXT_ACTION: Record<string, string> = {
  PENDING: '確認訂單',
  CONFIRMED: '開始製作',
  PREPARING: '製作完成',
};

export default function KitchenDisplay() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [enableCounterDisplay, setEnableCounterDisplay] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [boardLeadTime, setBoardLeadTime] = useState(60);
  const [showScheduled, setShowScheduled] = useState(true);

  useEffect(() => {
    fetch('/api/settings/order', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setEnableCounterDisplay(!!res.data.enableCounterDisplay);
          if (res.data.boardLeadTime !== undefined) setBoardLeadTime(res.data.boardLeadTime);
        }
      })
      .catch(() => {});
  }, []);

  const fetchOrders = useCallback(() => {
    // Fetch active orders (non-completed, non-cancelled)
    const statuses = KITCHEN_STATUSES.join(',');
    api.get<{ data: KitchenOrder[] }>(`/orders?limit=100&includeItems=true&status=${statuses}`)
      .then((res) => {
        setOrders(res.data);
        setLastRefresh(new Date());
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    // Derive socket URL from VITE_API_URL or window.location.origin
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '').replace(/\/$/, '');
    const socketUrl = apiBase || window.location.origin;
    
    console.log('Attempting socket connection to:', socketUrl);
    
    const s = io(socketUrl, { 
      path: '/socket.io', 
      transports: ['polling', 'websocket'], // Use polling first to bypass proxy/load-balancer issues, then upgrade
      reconnectionAttempts: 10,
      timeout: 20000,
    });
    
    setSocket(s);

    s.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      setSocketError(null);
      s.emit('join:kitchen');
    });

    s.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
      setSocketError(err.message);
    });

    s.on('order:new', () => {
      fetchOrders();
    });

    s.on('order:statusUpdate', (data: { id: string; status: string }) => {
      setOrders((prev) => {
        // Remove completed/cancelled orders from display
        if (!KITCHEN_STATUSES.includes(data.status)) {
          return prev.filter((o) => o.id !== data.id);
        }
        // Update status of existing order
        return prev.map((o) => o.id === data.id ? { ...o, status: data.status } : o);
      });
    });

    return () => {
      s.emit('leave:kitchen');
      s.disconnect();
    };
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      // Optimistic update — socket will also fire
      setOrders((prev) => {
        if (!KITCHEN_STATUSES.includes(newStatus)) {
          return prev.filter((o) => o.id !== orderId);
        }
        return prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o);
      });
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || '更新訂單狀態失敗');
      setTimeout(() => setActionError(null), 5000);
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const handleComplete = async (orderId: string, orderType: string) => {
    const completedStatus = orderType === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'PICKED_UP';
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: completedStatus });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || '結單失敗');
      setTimeout(() => setActionError(null), 5000);
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const getTimeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return t('kitchen.justNow') || '剛剛';
    if (mins < 60) return `${mins}m ${t('kitchen.ago') || '前'}`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ${t('kitchen.ago') || '前'}`;
  };

  // Separate scheduled vs immediate orders
  // Scheduled orders that are due within the configured lead time will be shown in the immediate columns
  const LEAD_TIME_MS = boardLeadTime * 60 * 1000;
  const now = new Date();

  const scheduledOrders = orders
    .filter((o) => o.scheduledAt && new Date(o.scheduledAt).getTime() > now.getTime() + LEAD_TIME_MS)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  const immediateOrders = orders.filter((o) => !o.scheduledAt || new Date(o.scheduledAt).getTime() <= now.getTime() + LEAD_TIME_MS);

  const ordersByStatus = KITCHEN_STATUSES.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    orders: immediateOrders.filter((o) => o.status === status).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
  }));

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Global Action Error Toast */}
      {actionError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg font-medium animate-bounce">
          {actionError}
        </div>
      )}
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-primary-400">{t('kitchen.title')}</h1>
          <div className="flex items-center gap-2" role="status">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? '即時連線' : socketError ? `連線中斷 (${socketError})` : '連線中斷'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {orders.length} 張進行中訂單 | 更新於 {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchOrders}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
            aria-label="Refresh orders"
          >
            {t('common.refresh') || '重新整理'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="載入中" />
        </div>
      ) : (
        <>
          {/* Scheduled orders banner */}
          {scheduledOrders.length > 0 && (
            <div className="mx-4 mt-4 bg-indigo-50 border border-indigo-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowScheduled(!showScheduled)}
                className="w-full flex items-center justify-between p-4 hover:bg-indigo-100/50 transition-colors"
              >
                <h3 className="text-sm font-bold text-indigo-800">
                  預約訂單 (Scheduled Orders: {scheduledOrders.length})
                </h3>
                <svg
                  className={`w-5 h-5 text-indigo-500 transition-transform ${showScheduled ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showScheduled && (
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-3">
                    {scheduledOrders.map((order) => (
                      <div key={order.id} className="bg-white rounded-lg border border-indigo-200 px-3 py-2 text-xs shadow-sm">
                        <span className="font-mono font-bold text-gray-900">#{order.orderNumber}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded font-medium ${order.orderType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                          {order.orderType === 'DELIVERY' ? '外送' : '自取'}
                        </span>
                        <span className="ml-2 text-indigo-600 font-medium">
                          {new Date(order.scheduledAt!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="ml-2 text-gray-800 font-bold">
                          {order.customer?.name || order.guestName || '顧客'}
                        </span>
                        <span className="ml-2 text-gray-400">{order.items.length} 個品項</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-4 gap-4 p-4 h-[calc(100vh-52px)] overflow-hidden">
            {ordersByStatus.map(({ status, config, orders: statusOrders }) => (
              <div key={status} className="flex flex-col min-h-0">
                {/* Column header */}
                <div className={`rounded-t-lg px-4 py-2 border-b-2 ${config.bg}`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`font-bold text-sm ${config.color}`}>{config.label}</h2>
                    <span className={`text-xs font-bold ${config.color} bg-white/50 px-2 py-0.5 rounded-full`}>
                      {statusOrders.length}
                    </span>
                  </div>
                </div>

                {/* Order cards */}
                <div className="flex-1 overflow-y-auto space-y-3 py-3">
                  {statusOrders.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">目前無訂單</p>
                  )}
                  {statusOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-lg shadow-sm border p-4 mx-1 ${updating === order.id ? 'opacity-50' : ''
                        }`}
                    >
                      {/* Order header */}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-primary-600 bg-primary-50 px-2 rounded">
                              {order.pickupNumber || '---'}
                            </span>
                            <span className="font-mono text-xs text-gray-400">
                              #{order.orderNumber}
                            </span>
                          </div>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${order.orderType === 'DELIVERY'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                            }`}>
                            {order.orderType === 'DELIVERY' ? '外送' : '自取'}
                          </span>
                          {order.isRemote !== undefined && (
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${order.isRemote ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {order.isRemote ? t('orders.remote') : t('orders.onSite')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{getTimeSince(order.createdAt)}</span>
                      </div>

                      {/* Customer info for single-person operation */}
                      {(!enableCounterDisplay) && (
                        <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-100">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-700">
                                {order.customer?.name || order.guestName || '顧客'}
                              </span>
                              <span className="text-[10px] text-blue-600 font-bold">
                                {order.customer?.phone || order.guestPhone}
                              </span>
                            </div>
                            {(order.customer?.email || order.guestEmail) && (
                              <p className="text-[10px] text-gray-400 truncate">
                                {order.customer?.email || order.guestEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-1 mb-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-gray-600 text-xs min-w-[20px]">
                                {item.quantity}x
                              </span>
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{item.name}</span>
                                {item.options.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                                  </p>
                                )}
                                {item.comment && (
                                  <p className="text-xs text-amber-600 italic">{item.comment}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order comment */}
                      {order.comment && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                          <p className="text-xs text-amber-700">{order.comment}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {config.next && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, config.next!)}
                            disabled={updating === order.id}
                            className="flex-1 bg-primary-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            aria-label={`${NEXT_ACTION[status]} order ${order.orderNumber}`}
                          >
                            {NEXT_ACTION[status]}
                          </button>
                        )}
                        {status === 'READY' && (
                          <button
                            onClick={() => handleComplete(order.id, order.orderType)}
                            disabled={updating === order.id}
                            className="flex-1 bg-green-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            aria-label={`Mark order ${order.orderNumber} as ${order.orderType === 'DELIVERY' ? 'out for delivery' : 'picked up'}`}
                          >
                            {order.orderType === 'DELIVERY' ? '開始外送' : '完成取餐'}
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                          disabled={updating === order.id}
                          className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          aria-label={`Cancel order ${order.orderNumber}`}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
