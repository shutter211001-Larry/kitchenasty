import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { API_BASE } from '../lib/api.js';
import { formatToFullDateTime } from '../utils/date.js';

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
  pickupNumber: string | null;
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
  location: { id: string; name: string };
  items: OrderItem[];
}

function getStepIndex(steps: { key: string; label: string }[], status: string): number {
  return steps.findIndex((s) => s.key === status);
}
import { getTranslated } from '../utils/translation.js';
import { useRecentOrders } from '../hooks/useRecentOrders.js';

export default function OrderStatus() {const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { token, user, logout } = useAuth();
  const { settings } = useTheme();
  const { addOrder } = useRecentOrders();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  useEffect(() => {
    if (!order?.scheduledAt) return;

    function updateCountdown() {
      const scheduledTime = new Date(order.scheduledAt).getTime();
      const now = new Date();
      const diffMs = scheduledTime - now.getTime();

      if (diffMs <= 0) {
        setTimeLeftStr('');
        return;
      }

      const taiwanTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(now);
      const taiwanScheduledStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(order.scheduledAt));
      
      if (taiwanTodayStr === taiwanScheduledStr) {
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        if (hours > 0) {
          setTimeLeftStr(t('orderStatus.timeLeftHoursMins', { hours, mins }) || `預計在 ${hours} 小時 ${mins} 分鐘後開始製作/送達`);
        } else {
          setTimeLeftStr(t('orderStatus.timeLeftMins', { mins }) || `預計在 ${mins} 分鐘後開始製作/送達`);
        }
      } else {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const taiwanTomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(tomorrow);
        
        if (taiwanScheduledStr === taiwanTomorrowStr) {
          setTimeLeftStr(t('orderStatus.tomorrow') || t('autoGen.store.key95'));
        } else {
          setTimeLeftStr(''); // Non-today/tomorrow doesn't show countdown
        }
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [order?.scheduledAt, t]);

  async function handleCancel() {
    if (!window.confirm(t('common.confirmCancel') || t('autoGen.store.key96'))) return;
    
    setCancelling(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setOrder({ ...order, status: 'CANCELLED' });
      } else {
        alert(data.error || t('autoGen.store.key97'));
      }
    } catch (e) {
      alert(t('autoGen.store.key98'));
    } finally {
      setCancelling(false);
    }
  }

  const DELIVERY_STEPS = [
    { key: 'PENDING', label: t('orderStatus.placed') },
    { key: 'CONFIRMED', label: t('orderStatus.confirmed') },
    { key: 'PREPARING', label: t('orderStatus.preparing') },
    { key: 'READY', label: t('orderStatus.ready') },
    { key: 'OUT_FOR_DELIVERY', label: t('orderStatus.outForDelivery') },
    { key: 'DELIVERED', label: t('orderStatus.delivered') },
  ];

  const PICKUP_STEPS = [
    { key: 'PENDING', label: t('orderStatus.placed') },
    { key: 'CONFIRMED', label: t('orderStatus.confirmed') },
    { key: 'PREPARING', label: t('orderStatus.preparing') },
    { key: 'READY', label: t('orderStatus.readyForPickup') },
    { key: 'PICKED_UP', label: t('orderStatus.pickedUp') },
  ];

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    // Try to load from cache first for instant feedback
    const cachedOrder = localStorage.getItem(`order_cache_${id}`);
    if (cachedOrder) {
      try {
        setOrder(JSON.parse(cachedOrder));
        setLoading(false); // We can stop loading early if we have cache
      } catch (e) {
        console.error('Failed to parse cached order');
      }
    }

    fetch(`${API_BASE}/orders/${id}`, { headers })
      .then((res) => {
        if (res.status === 401) {
          logout();
          throw new Error('UNAUTHORIZED_SILENT');
        }
        if (res.status === 403) throw new Error('LINKED_TO_ACCOUNT');
        if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
        return res.json();
      })
      .then((data) => {
        setOrder(data.data);
        if (data.data) {
          // Update cache
          localStorage.setItem(`order_cache_${id}`, JSON.stringify(data.data));
          
          addOrder({
            id: data.data.id,
            orderNumber: data.data.orderNumber,
            date: data.data.createdAt,
            total: data.data.total,
            orderType: data.data.orderType,
            itemCount: data.data.items?.length || 0
          });
        }
      })
      .catch((err) => {
        if (err.message === 'UNAUTHORIZED_SILENT') return;
        console.error('Order fetch failed:', err);
        if (err.message === 'LINKED_TO_ACCOUNT') {
          setError(t('orders.linkedToAccount'));
        } else if (!order) {
          setError(t('orders.errorLoading'));
        }
      })
      .finally(() => setLoading(false));
  }, [id, token, t]);

  async function handleClaim() {
    if (!token) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setClaimSuccess(true);
        setOrder({ ...order, customerId: user?.id });
      } else {
        alert(t('orders.claimOrderError'));
      }
    } catch (e) {
      alert(t('orders.claimOrderError'));
    } finally {
      setClaiming(false);
    }
  }

  // Real-time status updates via Socket.IO
  useEffect(() => {
    if (!id) return;

    const socketHost = API_BASE.replace(/\/api$/, '') || window.location.origin;
    const socket = io(socketHost, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('join:order', id);
    });

    socket.on('order:statusUpdate', (data) => {
      if (data.id === id) {
        setOrder((prev: any) => prev ? ({ ...prev, status: data.status }) : null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 border border-red-100 rounded-xl p-8 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-main mb-2">{error || t('orders.errorLoading')}</h2>
          <p className="text-sub mb-6">{error === t('orders.linkedToAccount') ? '' : t('orders.errorLoadingDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/account/orders" className="bg-surface text-main px-6 py-2 rounded-lg font-medium border border-input hover:bg-surface/80 transition-colors">
              {t('orders.backToOrders')}
            </Link>
            {error === t('orders.linkedToAccount') && (
              <Link to="/login" className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const steps = order.orderType === 'DELIVERY' ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentStep = steps.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Manual Claim Banner */}
      {user && !order.customerId && !claimSuccess && (
        <div className="mb-6 bg-primary-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 0010 11V7a4 4 0 118 0v4c0 1.28.382 2.47 1.03 3.46l.054.091M13 13.121V19m0 0H7m6 0h6" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{t('orders.claimOrderTitle')}</h3>
              <p className="text-white/80 text-sm">{t('orders.claimOrderDesc')}</p>
            </div>
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="whitespace-nowrap bg-white text-primary-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-primary-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {claiming ? t('checkout.processing') : t('orders.claimOrderSubmit')}
          </button>
        </div>
      )}

      {claimSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{t('orders.claimOrderSuccess')}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          {order.pickupNumber && (
            <div className="mb-2">
              <span className="text-xs text-hint font-medium uppercase tracking-wider">Pickup No.</span>
              <div className="text-5xl font-black text-primary-600 leading-none">
                {order.pickupNumber}
              </div>
            </div>
          )}
          <h1 className="text-xl font-bold text-main">#{order.orderNumber}</h1>
          <p className="text-sm text-sub mt-1">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {order.status === 'PENDING' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-red-500 hover:text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
            >
              {cancelling ? t('checkout.processing') : t('orders.cancelOrder')}
            </button>
          )}
          {(user || settings.showMembership) && (
            <Link to="/account/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              {t('orders.title')}
            </Link>
          )}
        </div>
      </div>

      {/* Elegant Scheduled Order Reassurance Card */}
      {order.scheduledAt && (
        <div className="surface-card rounded-xl shadow-sm border p-6 mb-6 border-primary-200 bg-gradient-to-br from-primary-50/40 via-surface to-surface animate-in fade-in slide-in-from-top-2 duration-300 relative overflow-hidden">
          {/* Subtle decorative glowing background circle */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-100/30 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
            <div className="bg-primary-500/10 p-3.5 rounded-2xl border border-primary-200/50 shadow-inner shrink-0 animate-pulse">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-main text-base leading-tight">
                  {t('orderStatus.scheduledOrderTitle') || t('autoGen.store.key99')}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-800 border border-primary-200">
                  {order.orderType === 'DELIVERY' ? t('checkout.delivery') : t('checkout.pickup')}
                </span>
              </div>
              
              <p className="text-sm font-semibold text-primary-700">
                {t('orderStatus.scheduledForTime') || t('autoGen.store.key100')}
                <span className="text-base font-extrabold text-gray-900 underline underline-offset-4 decoration-primary-300 decoration-2">
                  {formatToFullDateTime(order.scheduledAt, i18n.language)}
                </span>
              </p>
              
              {timeLeftStr ? (
                <p className="text-xs font-bold text-green-600 flex items-center gap-1.5 pt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  {timeLeftStr}
                </p>
              ) : (
                <p className="text-xs text-sub leading-normal pt-0.5">
                  {t('orderStatus.scheduledTips') || t('autoGen.store.key101')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Tracker */}
      <div className="surface-card rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-main mb-6">{t('orders.status')}</h2>

        {isCancelled ? (
          <div className="flex items-center gap-3 p-4 bg-red-50/10 border border-red-200/20 rounded-lg">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium text-red-600">{t('orderStatus.cancelledMessage')}</span>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => {
                const isComplete = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isComplete ? 'surface-brand' : 'bg-surface text-hint border border-input'
                      } ${isCurrent ? 'ring-4 ring-primary-100 scale-110' : ''}`}
                    >
                      {isComplete ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <span className={`text-[10px] mt-2 font-bold uppercase tracking-tighter ${isComplete ? 'text-main' : 'text-hint'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress Bar Background */}
            <div className="absolute top-5 left-0 w-full h-1 bg-surface -z-0" />
            {/* Active Progress Bar */}
            <div
              className="absolute top-5 left-0 h-1 bg-primary-600 transition-all duration-1000 ease-in-out -z-0"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="surface-card rounded-xl shadow-sm border overflow-hidden mb-6">
        <div className="p-4 border-b border-input bg-surface-soft">
          <h3 className="font-bold text-main">{t('orders.items')}</h3>
        </div>
        <div className="divide-y border-input">
          {order.items?.map((item: any) => (
            <div key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-main">
                    {item.quantity}x {getTranslated(item.name, (item as any).menuItem?.nameTranslations, i18n.language)}
                  </p>
                  {item.options?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.options.map((opt: any) => (
                        <span key={opt.id} className="text-[10px] bg-surface text-sub px-1.5 py-0.5 rounded border border-input">
                          {getTranslated(opt.value, opt.menuOptionValue?.nameTranslations, i18n.language)}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.comment && <p className="text-xs text-sub mt-1 italic">"{item.comment}"</p>}
                </div>
                <span className="text-sm font-medium text-main">${item.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 space-y-2 border-t border-input bg-surface-soft">
          <div className="flex justify-between text-sm text-sub">
            <span>{t('orders.subtotal')}</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-sm text-sub">
              <span>{t('checkout.tax') || t('autoGen.store.key102')}</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
          )}
          {(order.orderType === 'DELIVERY' || order.orderType === 'FROZEN_DELIVERY') && (
            <div className="flex justify-between text-sm text-sub">
              <span className="text-sub">{t('checkout.deliveryFee')}</span>
              <span className={order.deliveryFee === 0 ? "text-green-600 font-medium" : "text-main"}>
                {order.deliveryFee === 0 ? (t('checkout.free') || t('autoGen.store.key103')) : `$${order.deliveryFee.toFixed(2)}`}
              </span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>{t('checkout.discount')}</span>
              <span>-${order.discount.toFixed(2)}</span>
            </div>
          )}
          {(() => {
            const unrounded = order.subtotal + order.tax + order.deliveryFee - order.discount;
            const diff = order.total - unrounded;
            if (Math.abs(diff) > 0.001) {
              return (
                <div className="flex justify-between text-sm text-sub">
                  <span>{t('checkout.roundingAdjustment') || t('autoGen.store.key104')}</span>
                  <span>{diff > 0 ? '+' : ''}${diff.toFixed(2)}</span>
                </div>
              );
            }
            return null;
          })()}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-input">
            <span>{t('checkout.total')}</span>
            <span className="text-main">${order.total}</span>
          </div>
        </div>
      </div>

      {/* Custom Message */}
      {settings.orderStatusMessage && (
        <div className="surface-card rounded-xl shadow-sm border p-6 mb-6 bg-primary-50/30 border-primary-100">
          <p className="text-sm text-primary-900 font-medium whitespace-pre-wrap leading-relaxed">
            {getTranslated(
              settings.orderStatusMessage,
              settings.orderStatusMessageTranslations,
              i18n.language
            )}
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-4">
        {settings.navShowMenu && (
          <Link
            to="/menu"
            className="btn-primary"
          >
            {t('orderConfirmation.orderMore')}
          </Link>
        )}
        {settings.showMembership && (
          <Link
            to="/account/orders"
            className="border border-input text-main px-6 py-2.5 rounded-lg font-medium hover:bg-surface transition-colors"
          >
            {t('orders.title')}
          </Link>
        )}
      </div>
    </div>
  );
}
