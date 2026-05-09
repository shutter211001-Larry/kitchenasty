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

type OrderType = 'delivery' | 'pickup';
type PaymentMethod = 'cash' | 'stripe' | 'paypal';

// Default tax rate fallback if settings not loaded
const DEFAULT_TAX_RATE = 0;

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const { items, subtotal, clear } = useCart();
  const { user, token } = useAuth();
  const { settings } = useTheme();
  const { addOrder } = useRecentOrders();
  const navigate = useNavigate();

  const orderSettings = settings.orderSettings;
  const paymentSettings = settings.paymentSettings;

  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', zip: '' });
  const [scheduledAt, setScheduledAt] = useState('');
  const [comment, setComment] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Guest checkout fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Dynamic delivery fee from zone check
  const [deliveryFee, setDeliveryFee] = useState(4.99);
  const [zoneError, setZoneError] = useState('');

  // Busy mode
  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');

  // Loyalty points
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const loyaltyDiscount = loyaltyRedeem / 100;

  let currentTaxRate = orderSettings?.taxRate ?? DEFAULT_TAX_RATE;
  if (isNaN(currentTaxRate)) currentTaxRate = 0;
  const tax = subtotal * (currentTaxRate / 100);
  const currentDeliveryFee = orderType === 'delivery' ? deliveryFee : 0;
  const total = subtotal + tax + currentDeliveryFee - loyaltyDiscount;

  // Set defaults based on settings
  useEffect(() => {
    if (orderSettings) {
      if (orderSettings.deliveryEnabled && !orderSettings.pickupEnabled) {
        setOrderType('delivery');
      } else {
        setOrderType('pickup');
      }
    }
  }, [orderSettings]);

  // We explicitly DO NOT auto-select payment method to force user choice
  useEffect(() => {
    if (paymentSettings) {
      setPaymentMethod(null);
    }
  }, [paymentSettings]);

  // Check busy mode on mount
  useEffect(() => {
    fetch(`${API_BASE}/locations`)
      .then((res) => res.json())
      .then((data) => {
        const loc = data.data?.[0];
        if (loc?.isBusy) {
          setIsBusy(true);
          setBusyMessage(loc.busyMessage || 'This location is currently not accepting orders.');
        }
      })
      .catch(() => {});
  }, []);

  // Intersection Observer for the checkout button
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

    try {
      const orderItems = items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment,
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
      };

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

      if (orderType === 'delivery') {
        body.address = address;
      }

      // Guest info
      if (!user) {
        body.guestName = guestName;
        body.guestEmail = guestEmail;
        body.guestPhone = guestPhone || undefined;
      }

      // Loyalty points
      if (loyaltyRedeem > 0) {
        body.loyaltyPointsRedeem = loyaltyRedeem;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      clear();
      addOrder({
        id: data.data.id,
        orderNumber: data.data.orderNumber,
        date: new Date().toISOString(),
        total: data.data.total,
        orderType: data.data.orderType,
        itemCount: data.data.items?.length || 0,
      });
      navigate(`/orders/${data.data.id}`, { state: { order: data.data } });
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
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
        {/* Left: Form */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>
          )}

          {/* Order type */}
          {orderSettings?.deliveryEnabled && orderSettings?.pickupEnabled && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.orderType')}</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-colors ${
                    orderType === 'delivery'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-input text-sub hover:border-gray-300'
                  }`}
                >
                  {t('checkout.delivery')}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('pickup')}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-colors ${
                    orderType === 'pickup'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-input text-sub hover:border-gray-300'
                  }`}
                >
                  {t('checkout.pickup')}
                </button>
              </div>
            </div>
          )}

          {/* Delivery address */}
          {orderType === 'delivery' && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.deliveryAddress')}</h2>
              {zoneError && (
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
              </div>
            </div>
          )}

          {/* Schedule */}
          {orderSettings?.enableFutureOrdering && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.scheduling')}</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!scheduledAt}
                    onChange={() => setScheduledAt('')}
                    className="accent-primary-600"
                  />
                  <span className="text-sm text-sub">{t('checkout.asap')}</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!!scheduledAt}
                    onChange={() => setScheduledAt(getDefaultScheduleTime())}
                    className="accent-primary-600"
                  />
                  <span className="text-sm text-sub">{t('checkout.scheduled')}</span>
                </label>
                {scheduledAt && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
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

          {/* Coupon */}
          <div className="surface-card rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.couponCode')}</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
              />
              <button
                type="button"
                className="px-4 py-2 border border-input rounded-lg text-sm font-medium text-sub hover:bg-surface transition-colors"
              >
                {t('checkout.apply')}
              </button>
            </div>
          </div>

          {/* Loyalty Points Redemption */}
          {user && settings.loyaltyProgramEnabled && loyaltyBalance > 0 && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">Loyalty Points</h2>
              <p className="text-sm text-sub mb-3">
                You have <span className="font-bold text-primary-600">{loyaltyBalance}</span> points available
                (100 points = $1.00)
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={Math.min(loyaltyBalance, Math.floor(subtotal * 100))}
                  step={100}
                  value={loyaltyRedeem}
                  onChange={(e) => setLoyaltyRedeem(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-32 px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  placeholder="0"
                />
                <span className="text-sm text-sub">points to redeem</span>
                {loyaltyRedeem > 0 && (
                  <span className="text-sm font-medium text-green-600">
                    -${loyaltyDiscount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Payment method */}
          {paymentSettings?.stripeEnabled || paymentSettings?.paypalEnabled || paymentSettings?.cashEnabled ? (
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
                      <span className="text-[10px] opacity-70">下單後現場支付</span>
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
                      <span className="text-[10px] opacity-70">使用信用卡安全支付</span>
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
                      <span className="text-[10px] opacity-70">使用 PayPal 帳戶支付</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          ) : null}

          {/* Guest info or login prompt */}
          {!user && (
            <div className="surface-card rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-main mb-4">{t('checkout.contactInfo')}</h2>
              <div className="space-y-4">
                {settings.showMembership !== false && (
                  <div className="surface-brand/10 border border-brand-primary/20 p-4 rounded-lg mb-4">
                    <p className="text-sm text-main font-medium mb-3">
                      {t('checkout.loginBenefit')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`${API_BASE}/auth/google`}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-input rounded-lg text-sm font-medium text-sub hover:bg-surface/80 transition-colors shadow-sm"
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                        {t('checkout.googleLogin')}
                      </a>
                      <Link
                        to="/login"
                        className="px-4 py-2 text-sm font-semibold text-primary-500 hover:text-primary-400 underline decoration-primary-500/30 underline-offset-4 transition-colors"
                      >
                        {t('nav.login')}
                      </Link>
                      <Link
                        to="/register"
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
                    placeholder={t('checkout.phoneOptional')}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-main"
                  />
                </div>
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
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="text-hint mr-1">{item.quantity}x</span>
                      <span className="text-sub">
                        {getTranslated(item.name, item.nameTranslations, i18n.language)}
                      </span>
                      {item.options.length > 0 && (
                        <p className="text-xs text-hint ml-5">
                          {item.options.map((o) => getTranslated(o.valueName, o.valueNameTranslations, i18n.language)).join(', ')}
                        </p>
                      )}
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
              <div className="flex justify-between">
                <span className="text-main font-medium">{t('checkout.tax')}</span>
                <span className="text-main">${tax.toFixed(2)}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between">
                  <span className="text-main font-medium">{t('checkout.deliveryFee')}</span>
                  <span className="text-main">${currentDeliveryFee.toFixed(2)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>{t('checkout.loyaltyDiscount')}</span>
                  <span>-${loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-input pt-2 font-bold text-lg">
                <span className="text-main">{t('checkout.total')}</span>
                <span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              ref={submitButtonRef}
              type="submit"
              disabled={loading || isBusy}
              className="w-full mt-4 btn-primary disabled:opacity-50"
            >
              {isBusy
                ? t('checkout.currentlyUnavailable')
                : loading
                  ? t('checkout.processing')
                  : `${t('checkout.placeOrder')} — $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </form>

      {/* Mobile Floating Guide */}
      {!isButtonVisible && !isBusy && items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 surface-card/90 backdrop-blur-md border-t shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50 lg:hidden flex items-center justify-between animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col">
            <span className="text-[10px] text-hint font-bold uppercase tracking-wider">{t('checkout.total')}</span>
            <span className="text-xl font-black text-primary-600 leading-none">${total.toFixed(2)}</span>
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
