import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsOrder() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [frozenDeliveryEnabled, setFrozenDeliveryEnabled] = useState(false);
  const [allowGuestCheckout, setAllowGuestCheckout] = useState(true);
  const [minOrderDelivery, setMinOrderDelivery] = useState(0);
  const [minOrderPickup, setMinOrderPickup] = useState(0);
  const [minOrderFrozen, setMinOrderFrozen] = useState(0);
  const [deliveryLeadTime, setDeliveryLeadTime] = useState(30);
  const [pickupLeadTime, setPickupLeadTime] = useState(15);
  const [frozenLeadTime, setFrozenLeadTime] = useState(0);
  const [frozenDeliveryFee, setFrozenDeliveryFee] = useState(0);
  const [enableFutureOrdering, setEnableFutureOrdering] = useState(false);
  const [preOpeningBuffer, setPreOpeningBuffer] = useState(30);
  const [postClosingBuffer, setPostClosingBuffer] = useState(30);
  const [timeSlotInterval, setTimeSlotInterval] = useState(15);
  const [enableTipping, setEnableTipping] = useState(false);
  const [tipOptionsStr, setTipOptionsStr] = useState('10,15,20,25');
  const [taxRate, setTaxRate] = useState(0);
  const [loyaltyEarnRate, setLoyaltyEarnRate] = useState(1.0);
  const [loyaltyRedeemRate, setLoyaltyRedeemRate] = useState(100);
  const [boardLeadTime, setBoardLeadTime] = useState(60);
  const [enableCounterDisplay, setEnableCounterDisplay] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState<Record<string, boolean>>({
    PLACED: true,
    CONFIRMED: true,
    PREPARING: false,
    READY: true,
    OUT_FOR_DELIVERY: true,
    DELIVERED: false,
    PICKED_UP: false,
    CANCELLED: true,
  });

  useEffect(() => {
    fetch('/api/settings/order', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.enabled !== undefined) setEnabled(d.enabled);
          if (d.deliveryEnabled !== undefined) setDeliveryEnabled(d.deliveryEnabled);
          if (d.pickupEnabled !== undefined) setPickupEnabled(d.pickupEnabled);
          if (d.frozenDeliveryEnabled !== undefined) setFrozenDeliveryEnabled(d.frozenDeliveryEnabled);
          if (d.allowGuestCheckout !== undefined) setAllowGuestCheckout(d.allowGuestCheckout);
          if (d.minOrderDelivery !== undefined) setMinOrderDelivery(d.minOrderDelivery);
          if (d.minOrderPickup !== undefined) setMinOrderPickup(d.minOrderPickup);
          if (d.minOrderFrozen !== undefined) setMinOrderFrozen(d.minOrderFrozen);
          if (d.deliveryLeadTime !== undefined) setDeliveryLeadTime(d.deliveryLeadTime);
          if (d.pickupLeadTime !== undefined) setPickupLeadTime(d.pickupLeadTime);
          if (d.frozenLeadTime !== undefined) setFrozenLeadTime(d.frozenLeadTime);
          if (d.frozenDeliveryFee !== undefined) setFrozenDeliveryFee(d.frozenDeliveryFee);
          if (d.enableFutureOrdering !== undefined) setEnableFutureOrdering(d.enableFutureOrdering);
          if (d.preOpeningBuffer !== undefined) setPreOpeningBuffer(d.preOpeningBuffer);
          if (d.postClosingBuffer !== undefined) setPostClosingBuffer(d.postClosingBuffer);
          if (d.timeSlotInterval !== undefined) setTimeSlotInterval(d.timeSlotInterval);
          if (d.enableTipping !== undefined) setEnableTipping(d.enableTipping);
          if (d.enableCounterDisplay !== undefined) setEnableCounterDisplay(d.enableCounterDisplay);
          if (d.tipOptions) setTipOptionsStr(d.tipOptions.join(','));
          if (d.taxRate !== undefined) setTaxRate(d.taxRate);
          if (d.boardLeadTime !== undefined) setBoardLeadTime(d.boardLeadTime);
          if (d.loyaltyEarnRate !== undefined) setLoyaltyEarnRate(d.loyaltyEarnRate);
          if (d.loyaltyRedeemRate !== undefined) setLoyaltyRedeemRate(d.loyaltyRedeemRate);
          if (d.emailNotifications) {
            setEmailNotifications((prev) => ({ ...prev, ...d.emailNotifications }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    const tipOptions = tipOptionsStr.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    try {
      const res = await fetch('/api/settings/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          enabled, 
          deliveryEnabled, 
          pickupEnabled, 
          frozenDeliveryEnabled,
          allowGuestCheckout,
          minOrderDelivery, 
          minOrderPickup, 
          minOrderFrozen,
          deliveryLeadTime, 
          pickupLeadTime, 
          frozenLeadTime,
          frozenDeliveryFee, 
          enableFutureOrdering, 
          preOpeningBuffer,
          postClosingBuffer,
          timeSlotInterval,
          enableTipping, 
          enableCounterDisplay,
          tipOptions, 
          taxRate,
          boardLeadTime,
          loyaltyEarnRate,
          loyaltyRedeemRate,
          emailNotifications 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('autoGen.admin.key1416'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('autoGen.admin.key1417'));
      }
    } catch {
      setError(t('autoGen.admin.key1418'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('autoGen.admin.key1419')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">{t('autoGen.admin.key1420')}</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('autoGen.admin.key1421')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('autoGen.admin.key1422')}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? t('autoGen.admin.key1423') : t('autoGen.admin.key1424')}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">{t('autoGen.admin.key1425')}</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('autoGen.admin.key1426')}</span>
              </label>
              <div className={!deliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{t('autoGen.admin.key1427')}</label>
                <input type="number" min={0} step={0.01} value={minOrderDelivery} onChange={(e) => setMinOrderDelivery(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('autoGen.admin.key1428')}</label>
                <input type="number" min={0} value={deliveryLeadTime} onChange={(e) => setDeliveryLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <p className="text-[10px] text-gray-500 mt-2">{t('autoGen.admin.key1429')}</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('autoGen.admin.key1430')}</span>
              </label>
              <div className={!pickupEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{t('autoGen.admin.key1431')}</label>
                <input type="number" min={0} step={0.01} value={minOrderPickup} onChange={(e) => setMinOrderPickup(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('autoGen.admin.key1432')}</label>
                <input type="number" min={0} value={pickupLeadTime} onChange={(e) => setPickupLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <p className="text-[10px] text-gray-500 mt-2">{t('autoGen.admin.key1433')}</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={frozenDeliveryEnabled} onChange={(e) => setFrozenDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('autoGen.admin.key1434')}</span>
              </label>
              <div className={!frozenDeliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{t('autoGen.admin.key1435')}</label>
                <input type="number" min={0} step={0.01} value={minOrderFrozen} onChange={(e) => setMinOrderFrozen(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('autoGen.admin.key1436')}</label>
                <input type="number" min={0} value={frozenLeadTime} onChange={(e) => setFrozenLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('autoGen.admin.key1437')}</label>
                <input type="number" min={0} step={0.01} value={frozenDeliveryFee} onChange={(e) => setFrozenDeliveryFee(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-4">
          <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer">
            <input type="checkbox" checked={allowGuestCheckout} onChange={(e) => setAllowGuestCheckout(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <div>
              <p className="text-sm font-bold text-gray-900">{t('autoGen.admin.key1438')}</p>
              <p className="text-xs text-gray-500">{t('autoGen.admin.key1439')}</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 cursor-pointer">
            <input type="checkbox" checked={enableCounterDisplay} onChange={(e) => setEnableCounterDisplay(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <div>
              <p className="text-sm font-bold text-gray-900">{t('autoGen.admin.key1440')}</p>
              <p className="text-xs text-gray-500">{t('autoGen.admin.key1441')}</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enableFutureOrdering} onChange={(e) => setEnableFutureOrdering(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">{t('autoGen.admin.key1442')}</span>
          </label>

          {enableFutureOrdering && (
            <div className="ml-7 p-4 bg-blue-50/50 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">{t('autoGen.admin.key1443')}</label>
                <input 
                  type="number" 
                  value={preOpeningBuffer} 
                  onChange={(e) => setPreOpeningBuffer(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-blue-600 mt-1">{t('autoGen.admin.key1444')}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">{t('autoGen.admin.key1445')}</label>
                <input 
                  type="number" 
                  value={postClosingBuffer} 
                  onChange={(e) => setPostClosingBuffer(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-blue-600 mt-1">{t('autoGen.admin.key1446')}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">{t('autoGen.admin.key1447')}</label>
                <select 
                  value={timeSlotInterval} 
                  onChange={(e) => setTimeSlotInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value={5}>{t('autoGen.admin.key1448')}</option>
                  <option value={10}>{t('autoGen.admin.key1449')}</option>
                  <option value={15}>{t('autoGen.admin.key1450')}</option>
                  <option value={20}>{t('autoGen.admin.key1451')}</option>
                  <option value={30}>{t('autoGen.admin.key1452')}</option>
                  <option value={60}>{t('autoGen.admin.key1453')}</option>
                </select>
                <p className="text-[10px] text-blue-600 mt-1">{t('autoGen.admin.key1454')}</p>
              </div>
            </div>
          )}

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enableTipping} onChange={(e) => setEnableTipping(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">{t('autoGen.admin.key1455')}</span>
          </label>

          <div className={!enableTipping ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1456')}</label>
            <input type="text" value={tipOptionsStr} onChange={(e) => setTipOptionsStr(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="10,15,20,25" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1457')}</label>
            <input type="number" min={0} max={100} step={0.01} value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>

          <div className="p-5 bg-orange-50/30 rounded-xl border border-orange-100/50 space-y-4">
            <h3 className="text-sm font-bold text-orange-950 flex items-center gap-1.5">
              <span>{t('autoGen.admin.key1458')}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-orange-900 mb-1">{t('autoGen.admin.key1459')}</label>
                <input 
                  type="number" 
                  min={0} 
                  step={0.1}
                  value={loyaltyEarnRate} 
                  onChange={(e) => setLoyaltyEarnRate(parseFloat(e.target.value) || 0)} 
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" 
                  placeholder="1.0"
                />
                <p className="text-[10px] text-orange-750 mt-1">
                  {t('autoGen.admin.key1460')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-orange-900 mb-1">{t('autoGen.admin.key1461')}</label>
                <input 
                  type="number" 
                  min={1} 
                  step={1}
                  value={loyaltyRedeemRate} 
                  onChange={(e) => setLoyaltyRedeemRate(parseInt(e.target.value) || 100)} 
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" 
                  placeholder="100"
                />
                <p className="text-[10px] text-orange-750 mt-1">
                  {t('autoGen.admin.key1462')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <label className="block text-sm font-bold text-orange-800 mb-1">{t('autoGen.admin.key1463')}</label>
            <input 
              type="number" 
              min={0} 
              max={1440} 
              value={boardLeadTime} 
              onChange={(e) => setBoardLeadTime(parseInt(e.target.value) || 0)} 
              className="w-full max-w-xs px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" 
            />
            <p className="text-xs text-orange-600 mt-2">
              {t('autoGen.admin.key1464')}
              <br />
              {t('autoGen.admin.key1465')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? t('autoGen.admin.key1466') : t('autoGen.admin.key1467')}
          </button>
        </div>
    </div>
  );
}

