import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

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
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [orderType, setOrderType] = useState<'PICKUP' | 'DELIVERY' | 'FROZEN_DELIVERY'>('PICKUP');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [guestName, setGuestName] = useState(defaultGuestName);
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [address, setAddress] = useState({ line1: '', city: '', state: '', zip: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ data: Location[] }>('/locations'),
      api.get<{ data: MenuItem[] }>('/menu/items?include=options'),
    ])
      .then(([locs, items]) => {
        setLocations(locs.data);
        if (locs.data.length > 0) setSelectedLocationId(locs.data[0].id);
        setMenuItems(items.data.filter(i => i.isActive));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (item: MenuItem) => {
  // For simplicity, we add with no options first. 
    // In a full implementation, we would show a modal for options.
    const newItem: CartItem = {
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      unitPrice: item.price,
      subtotal: item.price,
      options: [],
    };
    setCart([...cart, newItem]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

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
      const orderData = {
        orderType,
        locationId: selectedLocationId,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options,
        })),
        guestName,
        guestPhone,
        guestEmail,
        address: (orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') ? address : undefined,
      };

      const res = await api.post<{ data: { id: string } }>('/orders', orderData);
      navigate(`/orders/${res.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('orderCreate.loading')}</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('orderCreate.addManualOrder')}</h1>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Menu Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">{t('orderCreate.selectProduct')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left group"
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
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">{t('orderCreate.customerInfo')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.name')}</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder={t('orderCreate.customerName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.phone')}</label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder={t('orderCreate.phoneNumber')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.email')}</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder={t('orderCreate.emailOptional')}
                />
              </div>
            </div>

            {(orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') && (
              <div className="mt-6 space-y-4 pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-900">{t('orderCreate.deliveryAddress')}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.streetAddress')}</label>
                  <input
                    type="text"
                    value={address.line1}
                    onChange={e => setAddress({ ...address, line1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder={t('orderCreate.cityLabel')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.postalCode')}</label>
                    <input
                      type="text"
                      value={address.zip}
                      onChange={e => setAddress({ ...address, zip: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder={t('orderCreate.areaCode')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary & Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">{t('orderCreate.orderSettings')}</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orderCreate.serviceBranch')}</label>
                <select
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
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
                <div className="flex justify-between text-lg font-bold">
                  <span>{t('orderCreate.total')}</span>
                  <span className="text-primary-600">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                disabled={submitting || cart.length === 0}
                onClick={handleSubmit}
                className="w-full mt-6 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-lg shadow-primary-200"
              >
                {submitting ? t('orderCreate.submitting') : t('orderCreate.createOrder')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
