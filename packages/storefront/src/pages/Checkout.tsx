import { useState, useEffect, FormEvent, useRef } from 'react';
import { API_BASE } from '../lib/api.js';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { getFullUrl } from '../utils/url.js';
import { getTranslated } from '../utils/translation.js';
import { useRecentOrders } from '../hooks/useRecentOrders.js';
import { formatToLocalDate, formatToLocalTime, formatToFullDateTime, getDateFriendlyLabel } from '../utils/date.js';

type OrderType = 'delivery' | 'pickup' | 'frozen_delivery';
type PaymentMethod = 'cash' | 'stripe' | 'paypal' | 'linepay';

// Default tax rate fallback if settings not loaded
const DEFAULT_TAX_RATE = 0;

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const { items, clear, tableName, setTableName, groupSessionId, groupPin, clientId, setGroupSession } = useCart();
  const { user, token } = useAuth();
  const { settings, refreshSettings } = useTheme();
  const { addOrder } = useRecentOrders();
  const navigate = useNavigate();

  const orderSettings = settings.orderSettings;
  const paymentSettings = settings.paymentSettings;

  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [lastCommonOrderType, setLastCommonOrderType] = useState<'delivery' | 'pickup'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', zip: '' });
  const [scheduledAt, setScheduledAt] = useState('');
  const [comment, setComment] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Guest checkout fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Dynamic delivery fee from zone check
  const [deliveryFee, setDeliveryFee] = useState(4.99);
  const [zoneError, setZoneError] = useState('');
  const [isClosedNow, setIsClosedNow] = useState(false);



  // Busy mode
  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [slotsByDay, setSlotsByDay] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Manage selected date for dropdown
  useEffect(() => {
    if (slotsByDay.length > 0) {
      const exists = slotsByDay.some(d => d.date === selectedDate);
      if (!exists) {
        setSelectedDate(slotsByDay[0].date);
      }
    } else {
      setSelectedDate('');
    }
  }, [slotsByDay, selectedDate]);

  // Determine if currently closed
  useEffect(() => {
    if (user?.isEmployee) {
      setIsClosedNow(false);
      return;
    }

    if (slotsByDay.length > 0) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
      const hasSlotsToday = slotsByDay.find(d => d.date === today);
      
      // If no slots today OR if we have slots but they all start much later, mark as closed
      if (!hasSlotsToday) {
        setIsClosedNow(true);
        // Auto-select first available slot if nothing is selected
        if (!scheduledAt) {
          setScheduledAt(slotsByDay[0].slots[0]);
        }
      } else {
        setIsClosedNow(false);
      }
    }
  }, [slotsByDay, scheduledAt, user]);

  // Loyalty points
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);

  const loyaltyRedeemRate = orderSettings?.loyaltyRedeemRate ?? 100;

  const myItems = groupSessionId ? items.filter(i => i.clientId === clientId) : items;

  const isOnlyFrozenItems = myItems.length > 0 && myItems.every(item => item.isFrozenDelivery === true);
  const frozenDeliveryEnabled = orderSettings?.frozenDeliveryEnabled ?? false;
  const showFrozenDeliveryOption = isOnlyFrozenItems && frozenDeliveryEnabled;

  const availableTypes = [
    orderSettings?.deliveryEnabled && { id: 'delivery', label: t('checkout.delivery') },
    orderSettings?.pickupEnabled && { id: 'pickup', label: t('checkout.pickup') },
  ].filter(Boolean) as { id: 'delivery' | 'pickup'; label: string }[];

  const [summary, setSummary] = useState<{
    subtotal: number;
    tax: number;
    deliveryFee: number;
    loyaltyDiscount: number;
    couponDiscount: number;
    total: number;
    freeDelivery: boolean;
    appliedPromo: { name: string, code?: string } | null;
    manualCouponError: string | null;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Debounced API call for summary
  useEffect(() => {
    if (myItems.length === 0) {
      setSummary(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const orderItems = myItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          comment: item.comment,
          redeemedWithPoints: item.redeemedWithPoints || undefined,
          options: item.options.map((o) => ({
            menuOptionValueId: o.valueId,
          })),
        }));

        const body: any = {
          items: orderItems,
          orderType: orderType.toUpperCase(),
          locationId: locationId || undefined,
          loyaltyPointsRedeem: loyaltyRedeem,
          couponCode: couponCode || undefined,
        };

        if (orderType === 'delivery' || orderType === 'frozen_delivery') {
          body.address = address;
        }

        const res = await fetch(`${API_BASE}/orders/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          setSummary(data.data);
        }
      } catch (err) {
        console.error('Failed to calculate summary', err);
      } finally {
        setIsCalculating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [myItems, orderType, locationId, loyaltyRedeem, couponCode, address.line1]);

  const subtotal = summary?.subtotal ?? 0;
  const tax = summary?.tax ?? 0;
  const currentDeliveryFee = summary?.deliveryFee ?? 0;
  const loyaltyDiscount = summary?.loyaltyDiscount ?? 0;
  const couponDiscount = summary?.couponDiscount ?? 0;
  const total = summary?.total ?? 0;
  const freeDelivery = summary?.freeDelivery ?? false;
  const manualCouponError = summary?.manualCouponError ?? null;
  const appliedPromo = summary?.appliedPromo ?? null;

  // Set defaults based on settings
  useEffect(() => {
    if (tableName) {
      setOrderType('pickup');
      setLastCommonOrderType('pickup');
    } else if (orderSettings) {
      if (orderSettings.deliveryEnabled && !orderSettings.pickupEnabled) {
        setOrderType('delivery');
        setLastCommonOrderType('delivery');
      } else {
        setOrderType('pickup');
        setLastCommonOrderType('pickup');
      }
    }
  }, [orderSettings, tableName]);

  // Refresh settings on mount to ensure payment options are up-to-date
  useEffect(() => {
    refreshSettings();
  }, []);

  // We explicitly DO NOT auto-select payment method to force user choice
  // Ensure we don't clear user selection if the background refresh finishes after they clicked,
  // UNLESS their selected method is no longer enabled.
  useEffect(() => {
    setPaymentMethod((current) => {
      if (!current) return null;
      if (!paymentSettings) return null;
      const isValid = 
        (current === 'stripe' && paymentSettings.stripeEnabled) ||
        (current === 'paypal' && paymentSettings.paypalEnabled) ||
        (current === 'linepay' && paymentSettings.linePayEnabled) ||
        (current === 'cash' && paymentSettings.cashEnabled);
      return isValid ? current : null;
    });
  }, [paymentSettings]);

  // Check busy mode on mount
  useEffect(() => {
    fetch(`${API_BASE}/locations`)
      .then((res) => res.json())
      .then((data) => {
        const loc = data.data?.[0];
        if (loc) {
          setLocationId(loc.id);
          // Allow employees to bypass the busy state
          if (loc.isBusy && !user?.isEmployee) {
            setIsBusy(true);
            setBusyMessage(loc.busyMessage || t('checkout.locationNotAcceptingOrders') || 'This location is currently not accepting orders.');
          } else {
            setIsBusy(false);
            setBusyMessage('');
          }
        }
      })
      .catch(() => {});
  }, [user?.isEmployee, t]);

  // Fetch available slots when location or order type changes
  useEffect(() => {
    if (locationId && orderSettings?.enableFutureOrdering) {
      fetch(`${API_BASE}/locations/${locationId}/available-slots?orderType=${orderType}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSlotsByDay(data.data);
          }
        })
        .catch(() => {});
    }
  }, [locationId, orderType, orderSettings?.enableFutureOrdering]);

  // Intersection Observer for the checkout button
  useEffect(() => {
    if (user?.phone) {
      setGuestPhone(user.phone);
    }
    if (user?.address && !address.line1) {
      setAddress(prev => ({ ...prev, line1: user.address || '' }));
    }
  }, [user]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsButtonVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (submitButtonRef.current) {
      observer.observe(submitButtonRef.current);
    }

    return () => observer.disconnect();
  }, [items.length]);

  const scrollToSubmit = () => {
    if (!paymentMethod) {
      setShowPaymentError(true);
      paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setShowPaymentError(false), 2000);
      return;
    }
    submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Fetch loyalty balance for logged-in users
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/loyalty/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setLoyaltyBalance(data.data.points);
        })
        .catch(() => {});
    }
  }, [token]);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-main mb-4">{t('checkout.emptyCart')}</h1>
        <Link
          to="/menu"
          className="inline-block btn-primary"
        >
          {t('checkout.browseMenu')}
        </Link>
      </div>
    );
  }

  if (orderSettings?.enabled === false) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-main mb-4">{t('checkout.currentlyUnavailable')}</h1>
        <p className="text-sub mb-6">Online ordering is currently disabled.</p>
        <Link to="/" className="inline-block btn-primary">
          {t('common.back')}
        </Link>
      </div>
    );
  }

  if (orderSettings?.deliveryEnabled === false && orderSettings?.pickupEnabled === false) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-main mb-4">{t('checkout.currentlyUnavailable')}</h1>
        <p className="text-sub mb-6">Delivery and pickup are currently unavailable.</p>
        <Link to="/" className="inline-block btn-primary">
          {t('common.back')}
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    
    // Validate payment method
    if (!paymentMethod) {
      setShowPaymentError(true);
      paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Shake animation is triggered by the class, but we can re-trigger it by toggling
      setTimeout(() => setShowPaymentError(false), 2000); 
      return;
    }

    setLoading(true);

    // Additional validation for scheduled orders
    if (scheduledAt) {
      const hasPhone = user ? (user.phone || guestPhone) : guestPhone;
      if (!hasPhone) {
        setError(t('checkout.phoneRequiredForScheduled'));
        setLoading(false);
        // Scroll to contact info
        document.getElementById('contact-info')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    let redirecting = false;
    try {
      const orderItems = myItems.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment,
        redeemedWithPoints: item.redeemedWithPoints || undefined,
        options: item.options.map((o) => ({
          menuOptionValueId: o.valueId,
          name: o.optionName,
          value: o.valueName,
          priceModifier: o.priceModifier,
        })),
      }));

      const body: Record<string, unknown> = {
        orderType: orderType.toUpperCase(),
        paymentMethod,
        items: orderItems,
        comment: comment || undefined,
        scheduledAt: scheduledAt || undefined,
        couponCode: couponCode || undefined,
        honeypot: honeypot || undefined,
      };

      if (tableName) {
        body.tableName = tableName;
        if (groupSessionId) {
          body.groupSessionId = groupSessionId;
        }
      }

      // Capture location (optional, won't block if fails)
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        body.userLat = position.coords.latitude;
        body.userLon = position.coords.longitude;
      } catch (err) {
        console.warn('Geolocation capture skipped or failed:', err);
      }

      if (orderType === 'delivery' || orderType === 'frozen_delivery') {
        body.address = address;
      }

      // Contact info
      if (!user) {
        body.guestName = guestName;
        body.guestEmail = guestEmail;
      }
      if (guestPhone) {
        body.guestPhone = guestPhone;
      }

      // Loyalty points
      if (loyaltyRedeem > 0) {
        body.loyaltyPointsRedeem = loyaltyRedeem;
      }

      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language || 'zh-TW',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      // Sync address and phone to user profile if updated
      if (token && user) {
        const isPhoneUpdated = guestPhone && guestPhone !== user.phone;
        const isAddressUpdated = address.line1 && address.line1 !== user.address;
        
        if (isPhoneUpdated || isAddressUpdated) {
          try {
            await fetch(`${API_BASE}/auth/me`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                ...(isPhoneUpdated ? { phone: guestPhone } : {}),
                ...(isAddressUpdated ? { address: address.line1 } : {})
              })
            });
          } catch (profileErr) {
            console.error('Failed to sync profile updates:', profileErr);
          }
        }
      }

      const orderData = {
        id: data.data.id,
        orderNumber: data.data.orderNumber,
        date: new Date().toISOString(),
        total: data.data.total,
        orderType: data.data.orderType,
        itemCount: data.data.items?.length || 0,
        scheduledAt: data.data.scheduledAt || undefined,
      };

      if (paymentMethod === 'linepay') {
        const lineRes = await fetch(`${API_BASE}/payments/linepay/create`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ orderId: data.data.id })
        });
        const lineData = await lineRes.json();
        if (lineData.success && lineData.data.paymentUrl) {
          redirecting = true;
          clear();
          addOrder(orderData);
          window.location.href = lineData.data.paymentUrl;
          return;
        } else {
          // If LINE Pay fails, we still want to clear the cart because the order is created
          redirecting = true;
          clear();
          addOrder(orderData);
          throw new Error(lineData.error || 'LINE Pay redirect failed');
        }
      }

      redirecting = true;
      clear();
      addOrder(orderData);
      navigate(`/orders/${data.data.id}`, { state: { order: data.data } });
    } catch (err: any) {
      if (!redirecting) {
        setError(err.message || t('common.error'));
      }
    } finally {
      if (!redirecting) {
        setLoading(false);
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-main mb-8">{t('checkout.title')}</h1>

      {isBusy && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-lg mb-6">
          <p className="font-semibold">{t('checkout.currentlyUnavailable')}</p>
          <p className="text-sm mt-1">{busyMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
        {/* Honeypot field - hidden from users but visible to bots */}
        <div style={{ display: 'none', visibility: 'hidden' }} aria-hidden="true">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        {/* Left: Form */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>
          )}

          {/* Table Banner */}
          {tableName && (
            <div className="bg-primary-50 border border-primary-200 text-primary-800 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span>🍽️</span>
                  <span>{t('checkout.dineInTable') || '內用桌號'} : {tableName}</span>
                </h2>
                {groupSessionId && groupPin ? (
                  <p className="text-sm mt-1 opacity-90 font-medium">
                    {t('groupOrder.groupOrderCode')}: <span className="text-lg font-black tracking-widest bg-white/50 px-2 py-0.5 rounded">{groupPin}</span>
                    <span className="block mt-1 text-xs opacity-75">{t('groupOrder.enterCodeToJoinTogether')}</span>
                  </p>
                ) : (
                  <p className="text-sm mt-1 opacity-90 font-medium">{t('checkout.dineInTableDesc') || '您的餐點將會為您準備於此桌位'}</p>
                )}
              </div>
              {!groupSessionId ? (
                <div className="flex flex-col gap-2 items-end">
                  {!isJoining ? (
                    <>
                      <button 
                        type="button" 
                        disabled={loading}
                        onClick={async () => {
                          try {
                            setError('');
                            setLoading(true);
                            const locRes = await fetch(`${API_BASE}/locations`);
                            const locData = await locRes.json();
                            const locId = locData.data?.[0]?.id;
                            if (!locId) throw new Error('Location not found');

                            const res = await fetch(`${API_BASE}/group-orders/create`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ locationId: locId, tableName })
                            });
                            const data = await res.json();
                            if (!data.success) throw new Error(data.error || t('groupOrder.errorStartFailed'));

                            setGroupSession(data.data.id, data.data.pin);
                          } catch (err: any) {
                            setError(err.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-sm font-bold bg-white px-4 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors whitespace-nowrap shadow-sm disabled:opacity-50"
                      >
                        {t('groupOrder.generateGroupCode')}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsJoining(true)} 
                        className="text-xs font-medium text-primary-600 hover:text-primary-800 transition"
                      >
                        {t('groupOrder.orEnterCodeToJoin')}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex gap-2">
                        <input 
                          value={pinInput} 
                          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} 
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500" 
                          placeholder={t('groupOrder.enter4DigitCode')} 
                          maxLength={4}
                        />
                        <button 
                          type="button"
                          onClick={async () => {
                            if (pinInput.length !== 4) {
                              setError(t('groupOrder.error4Digits'));
                              return;
                            }
                            try {
                              setLoading(true);
                              setError('');
                              const locRes = await fetch(`${API_BASE}/locations`);
                              const locData = await locRes.json();
                              const locId = locData.data?.[0]?.id;
                              if (!locId) throw new Error('Location not found');

                              const res = await fetch(`${API_BASE}/group-orders/join`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ locationId: locId, tableName, pin: pinInput })
                              });
                              const data = await res.json();
                              if (!data.success) throw new Error(data.error || t('groupOrder.errorInvalidCode'));

                              setGroupSession(data.data.id, data.data.pin);
                              setIsJoining(false);
                            } catch (err: any) {
                              setError(err.message);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading || pinInput.length !== 4} 
                          className="bg-gray-900 text-white px-4 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
                        >
                          {t('groupOrder.join')}
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsJoining(false)} 
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => {
                    if(window.confirm(t('groupOrder.confirmLeaveGroup'))) {
                      setGroupSession(null, null);
                    }
                  }}
                  className="text-sm font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap shadow-sm"
                >
                  {t('groupOrder.leaveGroupOrder')}
                </button>
              )}
            </div>
          )}

          {/* Order type */}
          {!tableName && availableTypes.length > 1 && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.orderType')}</h2>
              <div className="flex gap-3">
                {availableTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setOrderType(type.id);
                      setLastCommonOrderType(type.id);
                      if (orderType === 'frozen_delivery') {
                        setScheduledAt('');
                      }
                    }}
                    className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-colors ${
                      orderType === type.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-input text-sub hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery address */}
          {(orderType === 'delivery' || orderType === 'frozen_delivery') && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">
                {orderType === 'frozen_delivery' ? t('checkout.frozenDeliveryAddress') || '冷凍宅配收件地址' : t('checkout.deliveryAddress')}
              </h2>
              {zoneError && orderType === 'delivery' && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-3">{zoneError}</div>
              )}
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={t('checkout.addressLine1')}
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                />
                <input
                  type="text"
                  placeholder={t('checkout.addressLine2')}
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder={t('checkout.city')}
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
                  <input
                    type="text"
                    required
                    placeholder={t('checkout.state')}
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
                  <input
                    type="text"
                    required
                    placeholder={t('checkout.zipCode')}
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                    className="px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
                </div>
                
                {/* Global Address Auto-fill dynamic status card */}
                {user && (
                  <div className="pt-2 border-t border-input mt-3">
                    {address.line1 && address.line1 === user.address ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 animate-in fade-in slide-in-from-left-1 duration-200">
                        <span>{t('checkout.addressAutoFilled')}</span>
                      </div>
                    ) : address.line1 && user.address ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 animate-in fade-in slide-in-from-left-1 duration-200">
                        <span>{t('checkout.addressModified', { address: user.address })}</span>
                      </div>
                    ) : !address.line1 ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 animate-in fade-in slide-in-from-left-1 duration-200">
                        <span>{t('checkout.addressRequiredTip')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 animate-in fade-in slide-in-from-left-1 duration-200">
                        <span>{t('checkout.addressEntered')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule / Order Method */}
          {(orderSettings?.enableFutureOrdering || showFrozenDeliveryOption) && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">
                {lastCommonOrderType === 'delivery' ? t('checkout.deliveryTime') : t('checkout.scheduling')}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isClosedNow}
                    onClick={() => {
                      setOrderType(lastCommonOrderType);
                      setScheduledAt('');
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                      orderType !== 'frozen_delivery' && !scheduledAt && !isClosedNow
                        ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                        : isClosedNow
                          ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                          : 'border-input text-sub hover:border-gray-300'
                    }`}
                  >
                    {isClosedNow 
                      ? t('checkout.closed') || '今日已打烊' 
                      : lastCommonOrderType === 'delivery' ? t('checkout.asap_delivery') : t('checkout.asap_pickup')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType(lastCommonOrderType);
                      if (!scheduledAt && slotsByDay.length > 0 && slotsByDay[0].slots.length > 0) {
                        setScheduledAt(slotsByDay[0].slots[0]);
                      }
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                      orderType !== 'frozen_delivery' && !!scheduledAt
                        ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                        : 'border-input text-sub hover:border-gray-300'
                    }`}
                  >
                    {lastCommonOrderType === 'delivery' ? t('checkout.scheduled_delivery') : t('checkout.scheduled_pickup')}
                  </button>
                  {showFrozenDeliveryOption && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderType('frozen_delivery');
                        setScheduledAt('');
                      }}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                        orderType === 'frozen_delivery'
                          ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                          : 'border-input text-sub hover:border-gray-300'
                      }`}
                    >
                      {t('checkout.frozenDelivery') || '冷凍宅配'}
                    </button>
                  )}
                </div>

                {scheduledAt && slotsByDay.length > 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Elegant Custom Date Dropdown Selector */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-hint uppercase tracking-wider mb-1.5">
                        {t('checkout.selectDateFirst') || '選擇取餐日期'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-input rounded-xl text-sm font-semibold text-main hover:border-primary-400 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {selectedDate ? formatToLocalDate(selectedDate, i18n.language) : t('checkout.selectDateTime')}
                            {selectedDate && getDateFriendlyLabel(selectedDate, i18n.language) && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                                {getDateFriendlyLabel(selectedDate, i18n.language)}
                              </span>
                            )}
                          </span>
                        </div>
                        <svg
                          className={`w-5 h-5 text-hint transition-transform duration-300 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Options List */}
                      {isDropdownOpen && (
                        <>
                          {/* Overlay to close on outside click */}
                          <div className="fixed inset-0 z-20" onClick={() => setIsDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 mt-2 bg-surface border border-input rounded-xl shadow-xl z-30 max-h-[300px] overflow-y-auto no-scrollbar custom-scrollbar py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {slotsByDay.map((day) => {
                              const isCurrent = day.date === selectedDate;
                              const label = getDateFriendlyLabel(day.date, i18n.language);
                              return (
                                <button
                                  key={day.date}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(day.date);
                                    setIsDropdownOpen(false);
                                    if (day.slots.length > 0) {
                                      setScheduledAt(day.slots[0]);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left font-medium transition-colors ${
                                    isCurrent
                                      ? 'bg-primary-50 text-primary-700 font-bold'
                                      : 'text-main hover:bg-surface-soft'
                                  }`}
                                >
                                  <span>{formatToLocalDate(day.date, i18n.language)}</span>
                                  {label && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isCurrent ? 'bg-primary-600 text-white' : 'bg-gray-100 text-sub'
                                    }`}>
                                      {label}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Available Time Slots Grid */}
                    {selectedDate && (
                      <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                        <label className="block text-xs font-bold text-hint uppercase tracking-wider">
                          {lastCommonOrderType === 'delivery' ? t('checkout.scheduled_delivery') : t('checkout.scheduled_pickup')}
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {(slotsByDay.find(d => d.date === selectedDate)?.slots || []).map((slot: string) => {
                            const timeStr = formatToLocalTime(slot, i18n.language);
                            const isSelected = scheduledAt === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setScheduledAt(slot)}
                                className={`py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                                  isSelected
                                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm ring-2 ring-primary-100 scale-105 font-bold'
                                    : 'bg-surface border-input text-main hover:border-primary-400 hover:bg-surface/50'
                                }`}
                              >
                                {timeStr}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Warm Selected Time Reassurance Banner */}
                    {scheduledAt && (
                      <div className="mt-4 p-4 rounded-xl border border-green-200/50 bg-green-50/40 text-green-800 animate-in zoom-in-95 duration-300 flex items-start gap-3 shadow-sm shadow-green-50/20">
                        <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-xs">
                          <p className="font-bold text-green-900 mb-0.5">
                            {t('checkout.timeSelectionConfirmed') || '預約時間已選定'}
                          </p>
                          <p className="opacity-90 font-medium">
                            {t('checkout.scheduledFor') || '您已預約於'} <span className="font-bold underline underline-offset-2">{formatToFullDateTime(scheduledAt, i18n.language)}</span> {lastCommonOrderType === 'delivery' ? t('checkout.delivery') : t('checkout.pickup')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {scheduledAt && slotsByDay.length === 0 && (
                  <p className="text-xs text-hint italic">{t('checkout.noAvailableSlots') || '暫無可用預約時段'}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="surface-card rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.orderNotes')}</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main resize-none"
            />
          </div>

          {/* Discounts & Rewards */}
          <div className="surface-card rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-main mb-4">
              🎁 {t('checkout.discountsAndRewards') || '優惠與紅利'}
            </h2>
            
            <div className="space-y-6">
              {/* Coupon */}
              <div>
                <label className="block text-sm font-medium text-main mb-2">
                  {t('checkout.couponCode')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={t('checkout.enterCouponCode') || '輸入折扣碼'}
                    className="flex-1 px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 border border-input rounded-lg text-sm font-medium text-sub hover:bg-surface transition-colors"
                  >
                    {t('checkout.apply')}
                  </button>
                </div>
                {manualCouponError && (
                  <p className="mt-2 text-sm text-red-500 font-medium">
                    {manualCouponError}
                  </p>
                )}
              </div>

              {/* Loyalty Points Redemption */}
              {user && settings.loyaltyProgramEnabled && loyaltyBalance > 0 && (
                <div className="pt-6 border-t border-input">
                  <label className="block text-sm font-medium text-main mb-2">
                    {t('checkout.loyaltyTitle')}
                  </label>
                  <p className="text-sm text-sub mb-3">
                    {t('checkout.loyaltyPointsAvailable', { count: loyaltyBalance })}。
                    <span>({loyaltyRedeemRate} 點 = $1.00)</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={Math.min(loyaltyBalance, Math.floor(subtotal * loyaltyRedeemRate))}
                      step={100}
                      value={loyaltyRedeem}
                      onChange={(e) => setLoyaltyRedeem(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-32 px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                      placeholder="0"
                    />
                    <span className="text-sm text-sub">{t('checkout.loyaltyPointsToRedeem')}</span>
                    {loyaltyRedeem > 0 && (
                      <span className="text-sm font-medium text-green-600">
                        -${loyaltyDiscount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment method */}
          {paymentSettings?.stripeEnabled || paymentSettings?.paypalEnabled || paymentSettings?.cashEnabled || paymentSettings?.linePayEnabled ? (
            <div 
              ref={paymentSectionRef}
              className={`surface-card rounded-xl shadow-sm border p-6 transition-all duration-300 ${
                showPaymentError ? 'border-red-500 ring-2 ring-red-100 animate-shake shadow-lg shadow-red-50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-main">{t('checkout.paymentMethod')}</h2>
                {showPaymentError && (
                  <span className="text-xs font-bold text-red-500 animate-pulse">
                    ⚠️ {t('checkout.pleaseSelectPayment')}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {paymentSettings?.cashEnabled && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-input hover:border-gray-300 text-sub'
                  }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'cash'}
                      onChange={() => {
                        setPaymentMethod('cash');
                        setShowPaymentError(false);
                      }}
                      className="accent-primary-600 w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{t('checkout.cashOnDelivery')}</span>
                      <span className="text-[10px] opacity-70">{t('checkout.cashOnDeliverySub')}</span>
                    </div>
                  </label>
                )}
                {paymentSettings?.stripeEnabled && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'stripe'
                      ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-input hover:border-gray-300 text-sub'
                  }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'stripe'}
                      onChange={() => {
                        setPaymentMethod('stripe');
                        setShowPaymentError(false);
                      }}
                      className="accent-primary-600 w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{t('checkout.creditCard')}</span>
                      <span className="text-[10px] opacity-70">{t('checkout.creditCardSub') || '使用信用卡安全支付'}</span>
                    </div>
                  </label>
                )}
                {paymentSettings?.paypalEnabled && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-input hover:border-gray-300 text-sub'
                  }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => {
                        setPaymentMethod('paypal');
                        setShowPaymentError(false);
                      }}
                      className="accent-primary-600 w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">PayPal</span>
                      <span className="text-[10px] opacity-70">{t('checkout.paypalSub') || '使用 PayPal 帳戶支付'}</span>
                    </div>
                  </label>
                )}
                
                {paymentSettings?.linePayEnabled && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'linepay'
                      ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-input hover:border-gray-300 text-sub'
                  }`}
                  >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'linepay'}
                    onChange={() => {
                      setPaymentMethod('linepay');
                      setShowPaymentError(false);
                    }}
                    className="accent-primary-600 w-4 h-4"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">LINE Pay</span>
                    <span className="text-[10px] opacity-70">使用 LINE Pay 快速結帳</span>
                  </div>
                </label>
                )}
              </div>
            </div>
          ) : null}

          {/* Guest info or login prompt */}
          {!user ? (
            <div id="contact-info" className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.contactInfo')}</h2>
              <div className="space-y-4">
                {settings.showMembership !== false && (
                  <div className="surface-brand/10 border border-brand-primary/20 p-4 rounded-lg mb-4">
                    <p className="text-sm text-main font-medium mb-3">
                      {t('checkout.loginBenefit')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`${API_BASE}/auth/google?state=${encodeURIComponent('redirectUri=/checkout')}`}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-input rounded-lg text-sm font-medium text-sub hover:bg-surface/80 transition-colors shadow-sm"
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                        {t('checkout.googleLogin')}
                      </a>
                      
                      {settings.lineSettings?.liffId && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const liff = (window as any).liff;
                              if (!liff) return;
                              await liff.init({ liffId: settings.lineSettings!.liffId });
                              if (!liff.isLoggedIn()) {
                                localStorage.setItem('line_login_redirect', '/checkout');
                                liff.login({ redirectUri: window.location.origin + '/login' });
                                return;
                              }
                              const profile = await liff.getProfile();
                              const userEmail = liff.getDecodedIDToken()?.email;

                              const res = await fetch(`${API_BASE}/line/login`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  lineUserId: profile.userId,
                                  lineDisplayName: profile.displayName,
                                  email: userEmail,
                                  name: profile.displayName
                                }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                localStorage.setItem('token', data.data.token);
                                window.location.href = '/checkout';
                              }
                            } catch (err) {
                              console.error('LINE Login failed:', err);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#06C755] text-white rounded-lg text-sm font-bold hover:bg-[#05b34c] transition-colors shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2z" />
                          </svg>
                          {t('auth.lineSignIn')}
                        </button>
                      )}

                      <Link
                        to="/login?redirect=/checkout"
                        className="px-4 py-2 text-sm font-semibold text-primary-500 hover:text-primary-400 underline decoration-primary-500/30 underline-offset-4 transition-colors"
                      >
                        {t('nav.login')}
                      </Link>
                      <Link
                        to="/register?redirect=/checkout"
                        className="px-4 py-2 text-sm font-semibold text-primary-500 hover:text-primary-400 underline decoration-primary-500/30 underline-offset-4 transition-colors"
                      >
                        {t('nav.register')}
                      </Link>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={t('checkout.nameOptional')}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
                  <input
                    type="email"
                    placeholder={t('checkout.emailOptional')}
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
                  <input
                    type="tel"
                    required={!!scheduledAt}
                    placeholder={scheduledAt ? t('checkout.phonePlaceholderScheduled') : t('checkout.phonePlaceholder')}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className={`w-full px-3 py-2 bg-surface border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main ${
                      scheduledAt ? 'border-amber-300' : 'border-input'
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Logged in user: premium contact info card */
            <div id="member-contact-info" className="surface-card rounded-xl shadow-sm border p-6 border-primary-200 bg-primary-50/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-input pb-3">
                <div>
                  <h2 className="text-lg font-bold text-main flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('checkout.contactInfo') || '聯絡資訊'}
                  </h2>
                  <p className="text-xs text-sub mt-1">
                    {user.name} ({user.email})
                  </p>
                </div>
                <div>
                  {user?.isEmployee ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200 shadow-sm animate-pulse">
                      {t('checkout.staffMember') || '員工會員'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                      {t('checkout.loggedIn') || '已登入'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <label htmlFor="member-phone" className="block text-sm font-semibold text-main">
                  {t('checkout.phone') || '聯絡電話'}
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    id="member-phone"
                    type="tel"
                    required
                    placeholder={t('checkout.phonePlaceholder') || '請輸入聯絡電話'}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm text-main transition-all"
                  />
                  {guestPhone && guestPhone === user.phone && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {guestPhone && guestPhone === user.phone ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 animate-in fade-in slide-in-from-left-1 duration-200">
                    <span>{t('checkout.phoneAutoFilled') || '✓ 已自動帶入您的會員電話號碼'}</span>
                  </div>
                ) : guestPhone && user.phone ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 animate-in fade-in slide-in-from-left-1 duration-200">
                    <span>{t('checkout.phoneModified', { phone: user.phone }) || `已修改電話號碼 (會員原預設電話: ${user.phone})`}</span>
                  </div>
                ) : !guestPhone ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 animate-in fade-in slide-in-from-left-1 duration-200">
                    <span>{t('checkout.phoneRequiredTip') || '⚠️ 請填寫您的聯絡電話，以便我們在有需要時聯繫您'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 animate-in fade-in slide-in-from-left-1 duration-200">
                    <span>{t('checkout.phoneEntered') || '已輸入聯絡電話 (此號碼將與此筆訂單關聯)'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Order summary */}
        <div className="lg:w-80 shrink-0">
          <div className="surface-card rounded-xl shadow-sm border p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.orderSummary')}</h2>

            <div className="space-y-3 mb-4">
              {items.map((item) => {
                const optionsTotal = item.options.reduce((s, o) => s + o.priceModifier, 0);
                const isMine = item.clientId === clientId || !groupSessionId;
                return (
                  <div key={item.id} className={`flex justify-between text-sm ${!isMine ? 'opacity-40 grayscale' : ''}`}>
                    <div className="flex gap-2">
                      {groupSessionId && (
                        <div className="mt-0.5 flex-shrink-0">
                          <input 
                            type="checkbox" 
                            checked={isMine} 
                            readOnly 
                            className="accent-primary-600 w-4 h-4 cursor-not-allowed"
                            title={isMine ? "這是您點的餐點" : `由 ${item.guestName || '同行友人'} 點的餐點`}
                          />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">
                          <span className="text-hint mr-1">{item.quantity}x</span>
                          <span className="text-sub">
                            {getTranslated(item.name, item.nameTranslations, i18n.language)}
                          </span>
                          {!isMine && (
                            <span className="ml-2 text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                              {item.guestName || '同行友人'}
                            </span>
                          )}
                        </span>
                      {item.options.length > 0 && (
                        <p className="text-xs text-hint ml-5">
                          {item.options.map((o) => getTranslated(o.valueName, o.valueNameTranslations, i18n.language)).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-main font-medium">
                      ${((item.price + optionsTotal) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-3 space-y-2 text-sm border-input">
              <div className="flex justify-between">
                <span className="text-main font-medium">{t('checkout.subtotal')}</span>
                <span className="text-main">${subtotal.toFixed(2)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-main font-medium">{t('checkout.tax')}</span>
                  <span className="text-main">${tax.toFixed(2)}</span>
                </div>
              )}
              {(orderType === 'delivery' || orderType === 'frozen_delivery') && (
                <div className="flex justify-between">
                  <span className="text-main font-medium">{t('checkout.deliveryFee')}</span>
                  {freeDelivery ? (
                    <span className="text-green-600 font-medium">
                      {t('checkout.free') || '免運費'}
                      {appliedPromo && couponDiscount === 0 && (
                        <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {appliedPromo.name}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-main">${currentDeliveryFee.toFixed(2)}</span>
                  )}
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span className="flex items-center gap-2">
                    {t('checkout.discount') || '折扣'}
                    {appliedPromo && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {appliedPromo.name}
                      </span>
                    )}
                  </span>
                  <span>-${couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>{t('checkout.loyaltyDiscount')}</span>
                  <span>-${loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              {(() => {
                const decimals = (settings as any).currencyDecimals ?? 2;
                const unrounded = subtotal + tax + currentDeliveryFee - couponDiscount - loyaltyDiscount;
                const rounded = Number(unrounded.toFixed(decimals));
                const diff = rounded - unrounded;
                if (Math.abs(diff) > 0.001) {
                  return (
                    <div className="flex justify-between text-sub font-medium">
                      <span>{t('checkout.roundingAdjustment') || '結算調整 (Rounding)'}</span>
                      <span>{diff > 0 ? '+' : ''}${diff.toFixed(2)}</span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className={`flex justify-between border-t border-input pt-2 font-bold text-lg transition-opacity ${isCalculating ? 'opacity-50' : 'opacity-100'}`}>
                <span className="text-main">{t('checkout.total')}</span>
                <span className="text-primary-600">${Number(total.toFixed((settings as any).currencyDecimals ?? 2)).toFixed((settings as any).currencyDecimals ?? 2)}</span>
              </div>
            </div>

            <button
              ref={submitButtonRef}
              type="submit"
              disabled={loading || isBusy || isCalculating}
              className="w-full mt-4 btn-primary disabled:opacity-50 transition-all"
            >
              {isBusy
                ? t('checkout.currentlyUnavailable')
                : loading || isCalculating
                  ? t('checkout.processing')
                  : `${t('checkout.placeOrder')} — $${Number(total.toFixed((settings as any).currencyDecimals ?? 2)).toFixed((settings as any).currencyDecimals ?? 2)}`}
            </button>
          </div>
        </div>
      </form>

      {/* Mobile Floating Guide */}
      {!isButtonVisible && !isBusy && items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 surface-card/90 backdrop-blur-md border-t shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50 lg:hidden flex items-center justify-between animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col">
            <span className="text-[10px] text-hint font-bold uppercase tracking-wider">{t('checkout.total')}</span>
            <span className="text-xl font-black text-primary-600 leading-none">${Number(total.toFixed((settings as any).currencyDecimals ?? 2)).toFixed((settings as any).currencyDecimals ?? 2)}</span>
          </div>
          <button
            onClick={scrollToSubmit}
            className="btn-primary px-6 py-2.5 rounded-full text-sm shadow-lg shadow-primary-200 flex items-center gap-2 active:scale-95 transition-transform"
          >
            {t('checkout.placeOrder')}
            <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function getDefaultScheduleTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
