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

interface CounterOrder {
  id: string;
  orderNumber: string;
  pickupNumber?: string;
  orderType: string;
  status: string;
  comment: string | null;
  createdAt: string;
  scheduledAt: string | null;
  customer: { name: string; email?: string; phone?: string } | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  items: OrderItem[];
  isRemote?: boolean;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
}

const COUNTER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];

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

export default function CounterDisplay() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<CounterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [boardLeadTime, setBoardLeadTime] = useState(60);
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [cashReceivedInputs, setCashReceivedInputs] = useState<Record<string, string>>({});

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleKeypadPress = (orderId: string, value: string) => {
    setCashReceivedInputs((prev) => {
      const current = prev[orderId] || '';
      if (value === '⌫') {
        return { ...prev, [orderId]: current.slice(0, -1) };
      }
      if (value === '.') {
        if (current.includes('.')) return prev;
        return { ...prev, [orderId]: current + '.' };
      }
      if (current.length >= 7) return prev;
      return { ...prev, [orderId]: current + value };
    });
  };

  const handleQuickAmount = (orderId: string, amount: string) => {
    setCashReceivedInputs((prev) => ({ ...prev, [orderId]: amount }));
  };

  const handleClearAmount = (orderId: string) => {
    setCashReceivedInputs((prev) => ({ ...prev, [orderId]: '' }));
  };

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return localStorage.getItem('cds_location_id') || '';
  });

  useEffect(() => {
    fetch('/api/locations?limit=100', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setLocations(res.data);
        }
      })
      .catch(err => console.error('Failed to fetch locations:', err));
  }, []);

  const fetchOrders = useCallback(() => {
    const statuses = COUNTER_STATUSES.join(',');
    const locParam = selectedLocationId ? `&locationId=${selectedLocationId}` : '';
    api.get<{ data: CounterOrder[] }>(`/orders?limit=100&includeItems=true&status=${statuses}${locParam}`)
      .then((res) => {
        setOrders(res.data);
        setLastRefresh(new Date());
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [selectedLocationId]);

  useEffect(() => {
    fetchOrders();
    
    // Fetch and cache boardLeadTime locally
    const localLeadTime = localStorage.getItem('cds_boardLeadTime');
    if (localLeadTime !== null) {
      setBoardLeadTime(parseInt(localLeadTime) || 60);
    } else {
      fetch('/api/settings/order', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data && res.data.boardLeadTime !== undefined) {
            setBoardLeadTime(res.data.boardLeadTime);
            localStorage.setItem('cds_boardLeadTime', String(res.data.boardLeadTime));
          }
        })
        .catch(() => {});
    }
  }, [fetchOrders]);

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '').replace(/\/$/, '');
    const socketUrl = apiBase || window.location.origin;
    
    const s = io(socketUrl, { 
      path: '/socket.io', 
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      timeout: 20000,
    });
    
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      setSocketError(null);
      s.emit('join:kitchen', { locationId: selectedLocationId });
    });

    s.on('disconnect', () => setIsConnected(false));
    s.on('connect_error', (err) => {
      setIsConnected(false);
      setSocketError(err.message);
    });

    s.on('order:new', () => fetchOrders());
    s.on('order:statusUpdate', (data: { id: string; status: string }) => {
      setOrders((prev) => {
        if (!COUNTER_STATUSES.includes(data.status)) {
          return prev.filter((o) => o.id !== data.id);
        }
        return prev.map((o) => o.id === data.id ? { ...o, status: data.status } : o);
      });
    });

    return () => {
      s.emit('leave:kitchen', { locationId: selectedLocationId });
      s.disconnect();
    };
  }, [fetchOrders, selectedLocationId]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => {
        if (!COUNTER_STATUSES.includes(newStatus)) {
          return prev.filter((o) => o.id !== orderId);
        }
        return prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o);
      });
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || '更新失敗');
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
    if (mins < 1) return '剛剛';
    if (mins < 60) return `${mins}m 前`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m 前`;
  };

  const LEAD_TIME_MS = boardLeadTime * 60 * 1000;
  const now = new Date();

  const scheduledOrders = orders
    .filter((o) => o.scheduledAt && new Date(o.scheduledAt).getTime() > now.getTime() + LEAD_TIME_MS)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

  // Group scheduled orders by date
  const scheduledGroups = scheduledOrders.reduce((groups, order) => {
    const date = new Date(order.scheduledAt!).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(order);
    return groups;
  }, {} as Record<string, CounterOrder[]>);

  const immediateOrders = orders.filter((o) => !o.scheduledAt || new Date(o.scheduledAt).getTime() <= now.getTime() + LEAD_TIME_MS);

  const ordersByStatus = COUNTER_STATUSES.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    orders: immediateOrders.filter((o) => o.status === status).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
  }));

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {actionError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg font-medium animate-bounce">
          {actionError}
        </div>
      )}
      
      <div className="bg-purple-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-purple-300 font-sans">櫃台看板 (Counter Display)</h1>
          
          {/* Location Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-purple-200">📍</span>
            <select
              value={selectedLocationId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLocationId(val);
                localStorage.setItem('cds_location_id', val);
              }}
              className="bg-purple-800 text-xs text-white border border-purple-700 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold font-sans cursor-pointer"
            >
              <option value="">全部門市 (All Locations)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-purple-200">
              {isConnected ? '即時連線中' : '連線中斷'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-purple-200">
          <span>{orders.length} 張進行中 | 更新於 {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={fetchOrders} className="bg-purple-800 hover:bg-purple-700 px-3 py-1.5 rounded transition-colors">
            重新整理
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Scheduled orders banner - Grouped by Date */}
          {scheduledOrders.length > 0 && (
            <div className="mx-4 mt-4 space-y-2">
              <div className="flex items-center justify-between mb-1 px-1">
                <h3 className="text-sm font-bold text-indigo-800">
                  預約訂單 (Scheduled Orders: {scheduledOrders.length})
                </h3>
              </div>
              {Object.entries(scheduledGroups).map(([date, groupOrders]) => (
                <div key={date} className="bg-indigo-50 border border-indigo-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setCollapsedDates(prev => ({ ...prev, [date]: !prev[date] }))}
                    className="w-full flex items-center justify-between p-3 hover:bg-indigo-100/50 transition-colors"
                  >
                    <span className="text-xs font-bold text-indigo-700 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {date} ({groupOrders.length})
                    </span>
                    <svg
                      className={`w-4 h-4 text-indigo-400 transition-transform ${collapsedDates[date] ? '' : 'rotate-180'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {!collapsedDates[date] && (
                    <div className="px-3 pb-3">
                      <div className="flex flex-wrap gap-3">
                        {groupOrders.map((order) => (
                          <div key={order.id} className="bg-white rounded-lg border border-indigo-100 px-3 py-2 text-xs shadow-sm">
                            <span className="font-mono font-bold text-gray-900">#{order.orderNumber}</span>
                            <span className={`ml-2 px-1.5 py-0.5 rounded font-medium ${order.orderType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                              {order.orderType === 'DELIVERY' ? t('kitchen.delivery') : t('kitchen.pickup')}
                            </span>
                            <span className="ml-2 text-indigo-600 font-medium">
                              {new Date(order.scheduledAt!).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="ml-2 text-gray-800 font-bold">
                              {order.customer?.name || order.guestName || t('common.guest')}
                            </span>
                            <span className="ml-2 text-blue-600 font-bold">
                              ({order.customer?.phone || order.guestPhone})
                            </span>
                            <span className="ml-2 text-gray-400">{t('kitchen.itemsCount', { count: order.items.length })}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(t('kitchen.cancelConfirm'))) {
                                  handleStatusUpdate(order.id, 'CANCELLED');
                                }
                              }}
                              className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title={t('kitchen.cancelConfirm')}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-4 p-4 h-[calc(100vh-52px)] overflow-hidden">
          {ordersByStatus.map(({ status, config, orders: statusOrders }) => (
            <div key={status} className="flex flex-col min-h-0">
              <div className={`rounded-t-lg px-4 py-2 border-b-2 ${config.bg}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`font-bold text-sm ${config.color}`}>{config.label}</h2>
                  <span className={`text-xs font-bold ${config.color} bg-white/50 px-2 py-0.5 rounded-full`}>
                    {statusOrders.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 py-3">
                {statusOrders.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">{t('kitchen.noOrders')}</p>
                )}
                 {statusOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => toggleExpand(order.id)}
                    className={`bg-white rounded-lg shadow-sm border p-4 mx-1 cursor-pointer transition-all hover:border-purple-300 ${
                      updating === order.id ? 'opacity-50' : ''
                    } ${expandedOrders[order.id] ? 'ring-2 ring-purple-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-purple-600 bg-purple-50 px-2 rounded">
                          {order.pickupNumber || '---'}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-gray-400">#{order.orderNumber}</span>
                          <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${order.orderType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {order.orderType === 'DELIVERY' ? t('kitchen.delivery') : t('kitchen.pickup')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                        <span>{getTimeSince(order.createdAt)}</span>
                        <span className="text-gray-200">|</span>
                        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedOrders[order.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Scheduled / Pickup Time */}
                    {order.scheduledAt && (
                      <div className="mb-3 px-3 py-2 bg-indigo-50 border border-indigo-150 rounded-lg flex items-center justify-between text-indigo-800 font-semibold text-xs shadow-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm">🕒</span>
                          <span>
                            {order.orderType === 'DELIVERY' 
                              ? t('kitchen.deliveryTime') || '預約外送' 
                              : t('kitchen.pickupTime') || '預約取餐'
                            }
                          </span>
                        </span>
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-mono text-xs">
                          {(() => {
                            const d = new Date(order.scheduledAt);
                            const today = new Date();
                            const isToday = d.getDate() === today.getDate() &&
                                            d.getMonth() === today.getMonth() &&
                                            d.getFullYear() === today.getFullYear();
                            const timeStr = d.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
                            if (isToday) return timeStr;
                            const dateStr = d.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
                            return `${dateStr} ${timeStr}`;
                          })()}
                        </span>
                      </div>
                    )}

                    {/* Customer Data — The key difference */}
                    <div className="mb-4 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-bold text-gray-900">
                          {order.customer?.name || order.guestName || t('common.guest')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 ml-5">
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {order.customer?.phone || order.guestPhone || t('common.none')}
                        </div>
                        {(order.customer?.email || order.guestEmail) && (
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 truncate">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {order.customer?.email || order.guestEmail}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto pr-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-gray-400 text-xs mt-0.5">{item.quantity}x</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 leading-tight">{item.name}</p>
                              {item.options.length > 0 && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                                </p>
                              )}
                              {item.comment && (
                                <p className="text-[10px] text-amber-600 italic bg-amber-50 px-1 rounded mt-0.5 inline-block">"{item.comment}"</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pricing Breakdown & Checkout Calculator when expanded */}
                    {expandedOrders[order.id] && (
                      <div className="border-t border-gray-150 pt-3.5 mt-3.5 mb-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* Financial breakdown */}
                        <div className="text-xs text-gray-600 space-y-1.5 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                          <div className="flex justify-between">
                            <span>小計 (Subtotal)</span>
                            <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-red-600 font-medium">
                              <span>折扣 (Discount)</span>
                              <span>-${order.discount.toFixed(2)}</span>
                            </div>
                          )}
                          {order.tax > 0 && (
                            <div className="flex justify-between">
                              <span>稅金 (Tax)</span>
                              <span>${order.tax.toFixed(2)}</span>
                            </div>
                          )}
                          {order.deliveryFee > 0 && (
                            <div className="flex justify-between">
                              <span>外送費 (Delivery)</span>
                              <span>${order.deliveryFee.toFixed(2)}</span>
                            </div>
                          )}
                          {order.tip > 0 && (
                            <div className="flex justify-between">
                              <span>小費 (Tip)</span>
                              <span>${order.tip.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-extrabold text-gray-900 text-sm pt-2 border-t border-dashed border-gray-200">
                            <span>訂單金額 (Total)</span>
                            <span className="text-purple-600">${order.total?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>

                        {/* Interactive POS Checkout Calculator */}
                        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 space-y-3">
                          <h4 className="text-[11px] font-black text-purple-700 uppercase tracking-wider">簡易結帳計算器</h4>
                          
                          {/* Cash Input & Change Display */}
                          <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded-lg border border-purple-100">
                            <div className="flex justify-between items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-500 min-w-max">實收金額</span>
                              <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                <span className="text-gray-400 font-mono text-xs font-semibold">$</span>
                                <input
                                  type="text"
                                  readOnly
                                  value={cashReceivedInputs[order.id] || ''}
                                  placeholder="0"
                                  className="w-16 text-right font-mono font-bold text-gray-900 text-sm bg-transparent border-none outline-none focus:ring-0 p-0"
                                />
                              </div>
                            </div>
                            
                            {/* Change calculation */}
                            {(() => {
                              const cash = parseFloat(cashReceivedInputs[order.id] || '0');
                              const diff = cash - order.total;
                              if (!cashReceivedInputs[order.id]) {
                                return (
                                  <div className="text-right text-[10px] text-gray-400 italic">
                                    請輸入收受金額
                                  </div>
                                );
                              }
                              if (diff > 0) {
                                return (
                                  <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-gray-100 text-green-600 font-extrabold flex-wrap gap-1">
                                    <span>找零 (Change)</span>
                                    <span className="font-mono text-sm">${diff.toFixed(2)}</span>
                                  </div>
                                );
                              } else if (diff < 0) {
                                return (
                                  <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-gray-100 text-red-600 font-bold flex-wrap gap-1">
                                    <span>尚欠 (Remaining)</span>
                                    <span className="font-mono text-sm">${Math.abs(diff).toFixed(2)}</span>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-gray-100 text-green-700 font-extrabold bg-green-50/50 px-1.5 py-0.5 rounded flex-wrap gap-1">
                                    <span>金額剛好 (Exact)</span>
                                    <span>免找零</span>
                                  </div>
                                );
                              }
                            })()}
                          </div>

                          {/* Quick Cash Bills Panel */}
                          <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
                            <button
                              onClick={() => handleQuickAmount(order.id, order.total.toFixed(2))}
                              className="bg-purple-600 text-white rounded py-1 px-1 text-center hover:bg-purple-700 active:scale-95 transition-all shadow-sm truncate"
                              title="剛好"
                            >
                              剛好
                            </button>
                            <button
                              onClick={() => handleQuickAmount(order.id, '100')}
                              className="bg-white border border-purple-200 text-purple-700 rounded py-1 hover:bg-purple-50 active:scale-95 transition-all shadow-sm"
                            >
                              $100
                            </button>
                            <button
                              onClick={() => handleQuickAmount(order.id, '500')}
                              className="bg-white border border-purple-200 text-purple-700 rounded py-1 hover:bg-purple-50 active:scale-95 transition-all shadow-sm"
                            >
                              $500
                            </button>
                            <button
                              onClick={() => handleQuickAmount(order.id, '1000')}
                              className="bg-white border border-purple-200 text-purple-700 rounded py-1 hover:bg-purple-50 active:scale-95 transition-all shadow-sm"
                            >
                              $1000
                            </button>
                            <button
                              onClick={() => handleClearAmount(order.id)}
                              className="bg-red-50 text-red-600 border border-red-200 rounded py-1 hover:bg-red-100 active:scale-95 transition-all shadow-sm text-center"
                            >
                              清除
                            </button>
                          </div>

                          {/* Virtual Keypad */}
                          <div className="grid grid-cols-3 gap-1 bg-gray-100/50 p-1.5 rounded-lg border border-purple-100/50">
                            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '⌫'].map((key) => (
                              <button
                                key={key}
                                onClick={() => handleKeypadPress(order.id, key)}
                                className={`h-8 font-mono font-bold text-xs rounded transition-all active:scale-95 shadow-sm ${
                                  key === '⌫'
                                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/60'
                                }`}
                              >
                                {key}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {config.next && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, config.next!); }} disabled={updating === order.id} className="flex-1 bg-purple-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm transition-all active:scale-95">
                          {NEXT_ACTION[status]}
                        </button>
                      )}
                      {status === 'READY' && (
                        <button onClick={(e) => { e.stopPropagation(); handleComplete(order.id, order.orderType); }} disabled={updating === order.id} className="flex-1 bg-green-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm transition-all active:scale-95">
                          {order.orderType === 'DELIVERY' ? '開始外送' : '完成取餐'}
                        </button>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm('確定要取消此訂單嗎？')) {
                            handleStatusUpdate(order.id, 'CANCELLED');
                          }
                        }}
                        disabled={updating === order.id}
                        className="px-3 bg-red-50 text-red-600 text-xs font-bold py-2.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-all"
                        title="取消訂單"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
