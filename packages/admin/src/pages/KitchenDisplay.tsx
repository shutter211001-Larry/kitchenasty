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
  table?: { id: string; name: string } | null;
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
  paymentStatus?: string | null;
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

let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  return sharedAudioCtx;
};

const playNotificationSound = () => {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') {
      context.resume().catch((err) => {
        console.warn('Failed to resume AudioContext during play:', err);
      });
    }
    
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const osc = context.createOscillator();
      const gainNode = context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(context.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = context.currentTime;
    playNote(783.99, now, 0.25);
    playNote(1046.50, now + 0.12, 0.35);
  } catch (err) {
    console.warn('Audio playback failed or was blocked by browser policy:', err);
  }
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
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('PENDING');
  const [enableSound, setEnableSound] = useState<boolean>(() => {
    return localStorage.getItem('kds_enableSound') !== 'false';
  });

  useEffect(() => {
    const unlockAudio = () => {
      const context = getAudioContext();
      if (context && context.state === 'suspended') {
        context.resume().then(() => {
          console.log('AudioContext unlocked successfully');
          cleanup();
        }).catch((err) => {
          console.warn('Failed to unlock AudioContext:', err);
        });
      } else if (context && context.state === 'running') {
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return cleanup;
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return localStorage.getItem('kds_location_id') || '';
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

  useEffect(() => {
    const localLeadTime = localStorage.getItem('kds_boardLeadTime');
    const localCounter = localStorage.getItem('kds_enableCounterDisplay');
    
    if (localLeadTime !== null) {
      setBoardLeadTime(parseInt(localLeadTime) || 60);
    }
    if (localCounter !== null) {
      setEnableCounterDisplay(localCounter === 'true');
    }

    if (localLeadTime === null || localCounter === null) {
      fetch('/api/settings/order', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            if (localCounter === null) {
              setEnableCounterDisplay(!!res.data.enableCounterDisplay);
              localStorage.setItem('kds_enableCounterDisplay', String(!!res.data.enableCounterDisplay));
            }
            if (localLeadTime === null && res.data.boardLeadTime !== undefined) {
              setBoardLeadTime(res.data.boardLeadTime);
              localStorage.setItem('kds_boardLeadTime', String(res.data.boardLeadTime));
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  const fetchOrders = useCallback((playNotification = false) => {
    const statuses = KITCHEN_STATUSES.join(',');
    const locParam = selectedLocationId ? `&locationId=${selectedLocationId}` : '';
    api.get<{ data: KitchenOrder[] }>(`/orders?limit=100&includeItems=true&status=${statuses}${locParam}`)
      .then((res) => {
        if (playNotification && localStorage.getItem('kds_enableSound') !== 'false') {
          setOrders((prev) => {
            const prevIds = new Set(prev.map(o => o.id));
            const hasNew = res.data.some(o => !prevIds.has(o.id));
            if (hasNew) {
              playNotificationSound();
            }
            return res.data;
          });
        } else {
          setOrders(res.data);
        }
        setIsConnected(true);
        setSocketError(null);
        setLastRefresh(new Date());
      })
      .catch((err) => {
        setIsConnected(false);
        setSocketError(err.message || '連線錯誤');
      })
      .finally(() => setLoading(false));
  }, [selectedLocationId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Setup Socket.io for real-time updates
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL_PUBLIC || '';
    const token = localStorage.getItem('token');
    
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketError(null);
      socket.emit('join:kitchen', selectedLocationId ? { locationId: selectedLocationId } : undefined);
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setSocketError('連線錯誤');
      console.error('Socket connect error:', err);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('order:new', () => {
      fetchOrders(true);
    });

    socket.on('order:statusUpdate', () => {
      fetchOrders(true);
    });

    return () => {
      socket.emit('leave:kitchen', selectedLocationId ? { locationId: selectedLocationId } : undefined);
      socket.disconnect();
    };
  }, [selectedLocationId, fetchOrders]);

  // AudioContext user gesture unlock
  useEffect(() => {
    const unlockAudio = () => {
      const ctx = getAudioContext();
      if (ctx?.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

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

  // Group scheduled orders by date
  const scheduledGroups = scheduledOrders.reduce((groups, order) => {
    const date = new Date(order.scheduledAt!).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(order);
    return groups;
  }, {} as Record<string, KitchenOrder[]>);

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
          
          {/* Location Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">📍</span>
            <select
              value={selectedLocationId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLocationId(val);
                localStorage.setItem('kds_location_id', val);
              }}
              className="bg-gray-800 text-xs text-white border border-gray-700 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 font-semibold"
            >
              <option value="">全部門市 (All Locations)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2" role="status">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? '即時連線中' : socketError ? `連線中斷 (${socketError})` : '連線中斷'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {orders.length} 張進行中訂單 | 更新於 {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => {
              const next = !enableSound;
              setEnableSound(next);
              localStorage.setItem('kds_enableSound', String(next));
              if (next) playNotificationSound();
            }}
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 font-semibold"
            aria-label="Toggle sound notifications"
          >
            <span>{enableSound ? '🔊 聲音開啟' : '🔇 聲音關閉'}</span>
          </button>
          <button
            onClick={() => fetchOrders()}
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
          {/* Scheduled orders banner - Grouped by Date */}
          {scheduledOrders.length > 0 && (
            <div className="mx-4 mt-4 space-y-2">
              <div className="flex items-center justify-between mb-1 px-1">
                <h3 className="text-sm font-bold text-indigo-800">
                  {t('kitchen.scheduledOrders')} (Scheduled Orders: {scheduledOrders.length})
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
                            {order.table && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                🍽️ 桌號: {order.table.name}
                              </span>
                            )}
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
          {/* Mobile Top Tabs */}
          <div className="flex md:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 overflow-x-auto select-none">
            {KITCHEN_STATUSES.map((status) => {
              const conf = STATUS_CONFIG[status];
              const statusOrdersCount = immediateOrders.filter((o) => o.status === status).length;
              const isActive = activeTab === status;
              return (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className={`flex-1 min-w-[80px] py-3 text-center border-b-2 font-bold text-xs transition-all ${
                    isActive
                      ? 'border-primary-600 text-primary-700 bg-primary-50/20'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{conf.label.split(' ')[0]}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {statusOrdersCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 h-[calc(100vh-52px)] overflow-hidden">
            {ordersByStatus.map(({ status, config, orders: statusOrders }) => {
              const isTabActive = activeTab === status;
              return (
                <div key={status} className={`flex flex-col min-h-0 ${isTabActive ? 'flex' : 'hidden md:flex'}`}>
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
                    <p className="text-center text-gray-400 text-sm py-8">{t('kitchen.noOrders')}</p>
                  )}
                  {statusOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => toggleExpand(order.id)}
                      className={`rounded-lg p-4 mx-1 cursor-pointer transition-all hover:border-primary-300 ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-emerald-50/10 border-emerald-500 border-2 shadow-sm shadow-emerald-100/50'
                          : 'bg-white border border-gray-200 shadow-sm'
                      } ${updating === order.id ? 'opacity-50' : ''} ${
                        expandedOrders[order.id]
                          ? order.paymentStatus === 'PAID'
                            ? 'ring-2 ring-emerald-500'
                            : 'ring-2 ring-primary-500'
                          : ''
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
                          {order.table && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              🍽️ 桌號: {order.table.name}
                            </span>
                          )}
                          {order.isRemote !== undefined && (
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${order.isRemote ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {order.isRemote ? t('orders.remote') : t('orders.onSite')}
                            </span>
                          )}
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {order.paymentStatus === 'PAID' ? '已結帳 💰' : '未結帳 🔄'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span>{getTimeSince(order.createdAt)}</span>
                          <span className="text-gray-300">|</span>
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

                      {/* Customer info */}
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

                      {/* Pricing breakdown when expanded */}
                      {expandedOrders[order.id] && (
                        <div className="border-t border-gray-100 pt-3 mt-3 mb-3 text-xs text-gray-600 space-y-1.5 bg-gray-50/50 p-2.5 rounded-lg" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between">
                            <span>小計 (Subtotal)</span>
                            <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-red-600">
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
                              <span>外送費 (Delivery Fee)</span>
                              <span>${order.deliveryFee.toFixed(2)}</span>
                            </div>
                          )}
                          {order.tip > 0 && (
                            <div className="flex justify-between">
                              <span>小費 (Tip)</span>
                              <span>${order.tip.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-900 text-sm pt-1.5 border-t border-dashed border-gray-200">
                            <span>訂單金額 (Total)</span>
                            <span className="text-primary-600">${order.total?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {config.next && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, config.next!);
                            }}
                            disabled={updating === order.id}
                            className="flex-1 bg-primary-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            aria-label={`${NEXT_ACTION[status]} order ${order.orderNumber}`}
                          >
                            {NEXT_ACTION[status]}
                          </button>
                        )}
                        {status === 'READY' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(order.id, order.orderType);
                            }}
                            disabled={updating === order.id}
                            className="flex-1 bg-green-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            aria-label={`Mark order ${order.orderNumber} as ${order.orderType === 'DELIVERY' ? 'out for delivery' : 'picked up'}`}
                          >
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
                          className="px-2 bg-red-50 text-red-600 text-xs font-bold py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-all"
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
            );})}
          </div>
        </>
      )}
    </div>
  );
}
