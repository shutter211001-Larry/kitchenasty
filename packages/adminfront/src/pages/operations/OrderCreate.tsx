import { Html5QrcodeScanner } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageContent } from '../../components/layout/PageContent';
import { Clock } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'staff.roles.superAdmin',
  MANAGER: 'staff.roles.manager',
  STAFF: 'staff.roles.staff',
};

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  isActive: boolean;
  category: { id: string; name: string };
  options: {
    id: string;
    name: string;
    values: { id: string; name: string; priceModifier: number }[];
  }[];
}

interface Location {
  id: string;
  name: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  options: {
    menuOptionValueId: string;
    name: string;
    value: string;
    priceModifier: number;
  }[];
}

export default function OrderCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const defaultGuestName = user ? `${t(ROLE_LABELS[user.role] || user.role)} ${user.name}` : '';
  const canUseManualOverrides = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [orderType, setOrderType] = useState<'PICKUP' | 'DELIVERY' | 'FROZEN_DELIVERY'>('PICKUP');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guestName, setGuestName] = useState(defaultGuestName);
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [address, setAddress] = useState({ line1: '', city: '', state: '', zip: '' });
  const [frozenDeliveryMethod, setFrozenDeliveryMethod] = useState<'HOME_DELIVERY' | 'STORE_TO_STORE'>('HOME_DELIVERY');
  
  const [couponCode, setCouponCode] = useState('');
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [manualDeliveryFee, setManualDeliveryFee] = useState<number | ''>('');
  const [manualTax, setManualTax] = useState<number | ''>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [logisticsProvider, setLogisticsProvider] = useState('');
  const [comment, setComment] = useState('');
  
  const [invoiceType, setInvoiceType] = useState('CLOUD');
  const [invoiceCarrier, setInvoiceCarrier] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [donationCode, setDonationCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const [summary, setSummary] = useState<{
    subtotal: number;
    tax: number;
    deliveryFee: number;
    couponDiscount: number;
    total: number;
    freeDelivery: boolean;
    appliedPromo: { name: string; code?: string } | null;
    manualCouponError: string | null;
    estimatedWaitMins?: number | null;
    earliestSlot?: string | null;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 獲取店鋪列表
    api.get<{ data: Location[] }>('/locations').then((res) => {
      setLocations(res.data);
      if (res.data.length > 0) {
        setSelectedLocationId(res.data[0].id);
      }
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render((decodedText) => {
        scanner.clear();
        setShowScanner(false);
        setInvoiceCarrier(decodedText);
      }, (err) => {
        // ignore scan errors
      });

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showScanner]);

  useEffect(() => {
    if (!selectedLocationId) return;
    // Fetch menu items from API for the specific location
    api.get<{ data: MenuItem[] }>(`/menu/items?locationId=${selectedLocationId}`).then((res) => {
      setMenuItems(res.data.filter(i => i.isActive));
    }).catch(err => console.error('Failed to load menu items:', err));
  }, [selectedLocationId]);

  useEffect(() => {
    if (cart.length === 0) {
      setSummary(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const orderItems = cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options.map((o) => ({
            menuOptionValueId: o.menuOptionValueId,
          })),
        }));

        const body: any = {
          items: orderItems,
          orderType: orderType,
          locationId: selectedLocationId || undefined,
          couponCode: couponCode || undefined,
          manualDeliveryFee: manualDeliveryFee !== '' ? manualDeliveryFee : undefined,
          manualTax: manualTax !== '' ? manualTax : undefined,
        };

        if (orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') {
          body.address = address;
        }

        const res = await api.post<{ data: any }>('/orders/summary', body);
        if (res.data) {
          setSummary(res.data);
        }
      } catch (err) {
        console.error('Failed to calculate summary', err);
      } finally {
        setIsCalculating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cart, orderType, selectedLocationId, couponCode, address.line1, manualDeliveryFee, manualTax]);

  const openItemModal = (item: MenuItem) => {
    if (item.options && item.options.length > 0) {
      setSelectedItem(item);
      setSelectedOptions({});
    } else {
      addToCart(item, [], 0);
    }
  };

  const handleOptionChange = (optionId: string, valueId: string, checked: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[optionId] || [];
      if (checked) {
        return { ...prev, [optionId]: [...current, valueId] };
      } else {
        return { ...prev, [optionId]: current.filter(id => id !== valueId) };
      }
    });
  };

  const confirmAddToCart = () => {
    if (!selectedItem) return;
    
    let optionModifier = 0;
    const itemOptions: CartItem['options'] = [];
    
    selectedItem.options.forEach(opt => {
      const selected = selectedOptions[opt.id] || [];
      selected.forEach(valId => {
        const val = opt.values.find(v => v.id === valId);
        if (val) {
          optionModifier += val.priceModifier;
          itemOptions.push({
            menuOptionValueId: val.id,
            name: opt.name,
            value: val.name,
            priceModifier: val.priceModifier
          });
        }
      });
    });

    addToCart(selectedItem, itemOptions, optionModifier);
    setSelectedItem(null);
  };

  const addToCart = (item: MenuItem, options: CartItem['options'], optionModifier: number = 0) => {
    const unitPrice = item.price + optionModifier;
    const newItem: CartItem = {
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      unitPrice,
      subtotal: unitPrice,
      options,
    };
    setCart([...cart, newItem]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const subtotal = summary?.subtotal ?? cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = summary?.tax ?? 0;
  const deliveryFee = summary?.deliveryFee ?? 0;
  const autoCouponDiscount = summary?.couponDiscount ?? 0;
  const apiTotal = summary?.total ?? subtotal;
  const total = Math.max(0, apiTotal - manualDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError(t('orderCreate.emptyCart'));
      return;
    }
    if ((orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') && !address.line1) {
      setError(t('orderCreate.deliveryAddressRequired'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const body: any = {
        orderType,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options,
        })),
        locationId: selectedLocationId,
        couponCode: couponCode || undefined,
        manualDiscount: manualDiscount || undefined,
        manualDeliveryFee: manualDeliveryFee !== '' ? manualDeliveryFee : undefined,
        manualTax: manualTax !== '' ? manualTax : undefined,
        guestName: guestName || undefined,
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        frozenDeliveryMethod: orderType === 'FROZEN_DELIVERY' ? frozenDeliveryMethod : undefined,
        trackingNumber: trackingNumber || undefined,
        logisticsProvider: logisticsProvider || undefined,
        comment: comment || undefined,
        invoiceType: invoiceType || undefined,
        invoiceCarrier: invoiceCarrier || undefined,
        taxId: taxId || undefined,
        companyTitle: companyTitle || undefined,
        donationCode: donationCode || undefined,
      };

      if (orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') {
        body.address = address;
      }

      const res = await api.post<{ data: { id: string } }>('/orders', body);
      navigate(`/orders/${res.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('orderCreate.loading')}</div>;

  const groupedItems = menuItems.reduce((acc, item) => {
    const catId = item.category?.id || 'uncategorized';
    const catName = item.category?.name || t('orderCreate.uncategorized') || (t('orderCreate.15bfc5') || '未分類');
    if (!acc[catId]) {
      acc[catId] = { name: catName, items: [] };
    }
    acc[catId].items.push(item);
    return acc;
  }, {} as Record<string, { name: string, items: MenuItem[] }>);

  return (
    <div className="pb-12">
      <PageHeader
        title={t('orderCreate.addManualOrder')}
        backUrl="/orders"
        backText={t('orders.backToOrders')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {locations.length > 0 && (
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[150px]"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}
          </div>
        }
      />

      <PageContent>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Menu Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">{t('orderCreate.selectProduct')}</h2>
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([categoryId, group]) => {
                const isExpanded = expandedCategories[categoryId] !== false; // Default true (expanded)
                return (
                  <div key={categoryId} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => toggleCategory(categoryId)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
                    >
                      <span className="font-semibold text-gray-800">{group.name}</span>
                      <svg className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.items.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openItemModal(item)}
                            className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left group bg-white shadow-sm"
                          >
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-300">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{item.name}</div>
                              <div className="text-sm text-gray-500">${item.price.toFixed(2)}</div>
                            </div>
                            <div className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">{t('orderCreate.customerInfo')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.name')}</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                  placeholder={t('orderCreate.customerName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.phone')}</label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                  placeholder={t('orderCreate.phoneNumber')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.email')}</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                  placeholder={t('orderCreate.emailOptional')}
                />
              </div>
            </div>

            {orderType === 'FROZEN_DELIVERY' && (
              <div className="mt-4 flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setFrozenDeliveryMethod('HOME_DELIVERY')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                    frozenDeliveryMethod === 'HOME_DELIVERY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('orderCreate.homeDelivery') || (t('orderCreate.a4b4fb') || '宅配')}
                </button>
                <button
                  type="button"
                  onClick={() => setFrozenDeliveryMethod('STORE_TO_STORE')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                    frozenDeliveryMethod === 'STORE_TO_STORE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('orderCreate.storeToStore') || (t('orderCreate.380e90') || '店到店')}
                </button>
              </div>
            )}

            {orderType === 'FROZEN_DELIVERY' && frozenDeliveryMethod === 'STORE_TO_STORE' ? (
              <div className="mt-6 space-y-4 pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-900">{t('orderCreate.storeDetails') || (t('orderCreate.c3ae1f') || '取件門市資訊')}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.storeNameId') || (t('orderCreate.0a6a1d') || '門市名稱或店號')} *</label>
                  <input
                    type="text"
                    required
                    value={address.line1}
                    onChange={e => setAddress({ ...address, line1: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                    placeholder={t('orderCreate.ec797c') || '例如：7-11 信義店 (店號: 123456)'}
                  />
                </div>
              </div>
            ) : (orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') ? (
              <div className="mt-6 space-y-4 pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-900">{t('orderCreate.deliveryAddress')}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.streetAddress')}</label>
                  <input
                    type="text"
                    value={address.line1}
                    onChange={e => setAddress({ ...address, line1: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                    placeholder={t('orderCreate.streetAddressPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.city')}</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      placeholder={t('orderCreate.cityLabel')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.postalCode')}</label>
                    <input
                      type="text"
                      value={address.zip}
                      onChange={e => setAddress({ ...address, zip: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      placeholder={t('orderCreate.zipLabel')}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {orderType === 'FROZEN_DELIVERY' && (
              <div className="mt-6 space-y-4 pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-900">{t('orderCreate.fa810e') || (t('orderCreate.fa810e') || '物流資訊')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.logisticsProvider') || (t('orderCreate.419b66') || '物流服務商')}</label>
                    <input
                      type="text"
                      value={logisticsProvider}
                      onChange={e => setLogisticsProvider(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      placeholder={t('orderCreate.014638') || '例如：黑貓宅急便'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.trackingNumber') || (t('orderCreate.0f13e8') || '物流單號')}</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
                      placeholder={t('orderCreate.1bf20f') || '輸入單號'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary & Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">{t('orderCreate.orderSettings')}</h2>
            <div className="space-y-4 mb-6">
              {/* Location selection moved to PageHeader */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.pickupMethod')}</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setOrderType('PICKUP')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${orderType === 'PICKUP' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t('orderList.pickup')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('DELIVERY')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${orderType === 'DELIVERY' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t('orderList.delivery')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('FROZEN_DELIVERY')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${orderType === 'FROZEN_DELIVERY' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t('orderList.frozenDelivery') || 'Frozen Delivery'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h2 className="text-lg font-semibold mb-4">{t('orderCreate.shoppingCart')}</h2>
              {cart.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">{t('orderCreate.noProductSelected')}</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">x{item.quantity} - ${item.unitPrice.toFixed(2)}</div>
                      </div>
                      <div className="text-sm font-medium">${item.subtotal.toFixed(2)}</div>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('orderCreate.subtotal') || (t('orderCreate.879915') || '小計')}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('orderCreate.tax') || (t('orderCreate.f418d3') || '稅金')}</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                )}
                {(orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('orderCreate.deliveryFee') || (t('orderCreate.d6bea8') || '運費')}</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {autoCouponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t('orderCreate.discount') || (t('orderCreate.53db5d') || '優惠折扣')} {summary?.appliedPromo?.name && `(${summary.appliedPromo.name})`}</span>
                    <span>-${autoCouponDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="space-y-3 pt-3 border-t border-gray-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('orderCreate.couponCode') || (t('orderCreate.03a46b') || '優惠碼')}</label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm transition-all duration-200"
                      placeholder={t('orderCreate.bada06') || '輸入優惠碼'}
                    />
                    {summary?.manualCouponError && (
                      <p className="text-xs text-red-500 mt-1">{summary.manualCouponError}</p>
                    )}
                  </div>
                  {canUseManualOverrides && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('orderCreate.manualDiscount') || (t('orderCreate.7c88c4') || '手動折扣金額')}</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            value={manualDiscount || ''}
                            onChange={e => setManualDiscount(parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm transition-all duration-200"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {(orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">{t('orderCreate.manualDeliveryFee') || (t('orderCreate.4efe3b') || '手動設定運費 (留空套用系統運費)')}</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              min="0"
                              value={manualDeliveryFee}
                              onChange={e => setManualDeliveryFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm transition-all duration-200"
                              placeholder={t('orderCreate.3cdca2') || '留空自動計算'}
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('orderCreate.manualTax') || (t('orderCreate.44e160') || '手動設定稅金 (留空套用系統稅金)')}</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-gray-500 text-sm">$</span>
                          <input
onChange={e => setManualTax(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm transition-all duration-200"
                            placeholder={t('orderCreate.3cdca2') || '留空自動計算'}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-50">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('orderCreate.comment') || '備註'}</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none shadow-sm transition-all duration-200 resize-none"
                    placeholder={t('orderCreate.commentPlaceholder') || '輸入訂單備註...'}
                    rows={2}
                  />
                </div>

                <div className="pt-3 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">{t('orderCreate.invoiceTitle') || '發票與稅務'}</label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('orderCreate.invoiceType') || '發票類型'}</label>
                      <select
                        value={invoiceType}
                        onChange={(e) => setInvoiceType(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                      >
                        <option value="CLOUD">{t('orderCreate.invoiceCloud') || '雲端載具'}</option>
                        <option value="COMPANY">{t('orderCreate.invoiceCompany') || '公司統編'}</option>
                        <option value="DONATE">{t('orderCreate.invoiceDonate') || '捐贈發票'}</option>
                      </select>
                    </div>
                    
                    {invoiceType === 'CLOUD' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('orderCreate.invoiceCarrier') || '手機載具'}</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={invoiceCarrier}
                            onChange={(e) => setInvoiceCarrier(e.target.value.toUpperCase())}
                            placeholder="/ABC1234"
                            className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none uppercase"
                          />
                          <button
                            type="button"
                            onClick={() => setShowScanner(!showScanner)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-600 transition-colors"
                            title={t('orderCreate.scanCarrier') || '掃描載具'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {invoiceType === 'COMPANY' && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">{t('orderCreate.taxId') || '統一編號'}</label>
                          <input
                            type="text"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            maxLength={8}
                            placeholder="12345678"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">{t('orderCreate.companyTitle') || '公司抬頭'}</label>
                          <input
                            type="text"
                            value={companyTitle}
                            onChange={(e) => setCompanyTitle(e.target.value)}
                            placeholder="公司名稱"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                          />
                        </div>
                      </>
                    )}
                    
                    {invoiceType === 'DONATE' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('orderCreate.donationCode') || '愛心碼'}</label>
                        <input
                          type="text"
                          value={donationCode}
                          onChange={(e) => setDonationCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
                          maxLength={7}
                          placeholder="123456"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {showScanner && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                      <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
                        <h3 className="text-lg font-bold text-center mb-4">{t('orderCreate.scanCarrier') || '掃描載具'}</h3>
                        <div id="reader" className="w-full rounded-xl overflow-hidden mb-4 border-2 border-gray-100"></div>
                        <button
                          type="button"
                          onClick={() => setShowScanner(false)}
                          className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          {t('orderCreate.closeCamera') || '關閉相機'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {summary?.estimatedWaitMins != null && (
                  <div className="flex justify-between items-center text-sm font-medium pt-3 mt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-700">{t('orderCreate.estimatedWaitTime') || (t('orderCreate.38663c') || '預估製作時間')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-orange-600 font-bold">{summary.estimatedWaitMins} {t('orderCreate.minutes') || (t('orderCreate.ac055c') || '分鐘')}</span>
                      {summary.earliestSlot && (
                        <div className="text-xs text-gray-500 font-normal mt-0.5">
                          {t('orderCreate.expectedReadyTime') || (t('orderCreate.1f0aa1') || '預計取餐')}: {new Date(summary.earliestSlot).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold pt-3 mt-3 border-t border-gray-200">
                  <span>{t('orderCreate.total')}</span>
                  <span className="text-primary-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {summary?.estimatedWaitMins != null && summary.estimatedWaitMins > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm flex items-center justify-between">
                  <span className="font-medium">{t('orderCreate.89cffa') || (t('orderCreate.89cffa') || '預計取餐/等候時間')}</span>
                  <div className="text-right">
                    <div className="font-bold">{t('orderCreate.ebb4a1') || (t('orderCreate.ebb4a1') || '約')}{summary.estimatedWaitMins} {t('orderCreate.ac055c') || (t('orderCreate.ac055c') || '分鐘')}</div>
                    {summary.earliestSlot && (
                      <div className="text-xs opacity-75">
                        {new Date(summary.earliestSlot).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                disabled={submitting || cart.length === 0 || isCalculating}
                onClick={handleSubmit}
                className="w-full mt-6 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-lg shadow-primary-200"
              >
                {submitting || isCalculating ? (t('orderCreate.submitting') || (t('orderCreate.ca0536') || '處理中...')) : t('orderCreate.createOrder')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">{selectedItem.name} - {t('orderCreate.optionsTitle') || (t('orderCreate.ae399d') || '餐點選項')}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {selectedItem.options.map(opt => (
                <div key={opt.id}>
                  <h4 className="font-medium text-sm text-gray-900 mb-2">{opt.name}</h4>
                  <div className="space-y-2">
                    {opt.values.map(val => (
                      <label key={val.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                          checked={(selectedOptions[opt.id] || []).includes(val.id)}
                          onChange={e => handleOptionChange(opt.id, val.id, e.target.checked)}
                        />
                        <span className="flex-1 text-sm">{val.name}</span>
                        {val.priceModifier > 0 && <span className="text-sm text-gray-500">+${val.priceModifier.toFixed(2)}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('orderCreate.cancel') || (t('orderCreate.625fb2') || '取消')}
              </button>
              <button
                onClick={confirmAddToCart}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                {t('orderCreate.addCart') || (t('orderCreate.c81347') || '加入購物車')}
              </button>
            </div>
          </div>
        </div>
      )}
      </PageContent>
    </div>
  );
}
