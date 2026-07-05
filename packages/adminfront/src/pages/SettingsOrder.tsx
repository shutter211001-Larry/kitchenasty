import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToggleRow } from '../components/ui/ToggleRow.js';

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

  const [enableTCat, setEnableTCat] = useState(false);
  const [enablePelican, setEnablePelican] = useState(false);
  const [enableECPay, setEnableECPay] = useState(false);

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
          if (d.enableTCat !== undefined) setEnableTCat(d.enableTCat);
          if (d.enablePelican !== undefined) setEnablePelican(d.enablePelican);
          if (d.enableECPay !== undefined) setEnableECPay(d.enableECPay);
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
          enableTCat,
          enablePelican,
          enableECPay,
          emailNotifications 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('settingsOrder.orderSettingsUpdated'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('settingsOrder.saveFailed'));
      }
    } catch {
      setError(t('settingsOrder.networkError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('settingsOrder.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">{t('settingsOrder.backToSettings')}</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('settingsOrder.onlineOrderingGeneralSettings')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('settingsOrder.onlineOrderingSettingsDesc')}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? t('settingsOrder.savingInProgress') : t('settingsOrder.saveChanges')}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">{t('settingsOrder.enableSiteWideOnlineOrdering')}</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('settingsOrder.enableDeliveryService')}</span>
              </label>
              <div className={!deliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{t('settingsOrder.defaultDeliveryMinSpend')}</label>
                <input type="number" min={0} step={0.01} value={minOrderDelivery} onChange={(e) => setMinOrderDelivery(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('settingsOrder.defaultDeliveryEstimatedTime')}</label>
                <input type="number" min={0} value={deliveryLeadTime} onChange={(e) => setDeliveryLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <p className="text-[10px] text-gray-500 mt-2">{t('settingsOrder.overridePriorityDesc')}</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('settingsOrder.enablePickupService')}</span>
              </label>
              <div className={!pickupEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{t('settingsOrder.defaultPickupMinSpend')}</label>
                <input type="number" min={0} step={0.01} value={minOrderPickup} onChange={(e) => setMinOrderPickup(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('settingsOrder.defaultPickupPrepTime')}</label>
                <input type="number" min={0} value={pickupLeadTime} onChange={(e) => setPickupLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <p className="text-[10px] text-gray-500 mt-2">{t('settingsOrder.storePrepTimeDesc')}</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={frozenDeliveryEnabled} onChange={(e) => setFrozenDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('settingsOrder.enableFrozenDeliveryService')}</span>
              </label>
              <div className={!frozenDeliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{t('settingsOrder.defaultFrozenDeliveryMinSpend')}</label>
                <input type="number" min={0} step={0.01} value={minOrderFrozen} onChange={(e) => setMinOrderFrozen(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('settingsOrder.defaultFrozenDeliveryPrepTime')}</label>
                <input type="number" min={0} value={frozenLeadTime} onChange={(e) => setFrozenLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">{t('settingsOrder.frozenDeliveryBaseFee')}</label>
                <input type="number" min={0} step={0.01} value={frozenDeliveryFee} onChange={(e) => setFrozenDeliveryFee(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Logistics Channels */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">物流通道預留設定 (Logistics API Channels)</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded">Future API</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">這些開關將控制出貨選項。當您取得第三方物流 API 金鑰後，可以開啟對應通道，讓店員看見出貨選項。</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="font-medium text-gray-900 block">黑貓宅急便 (T-Cat)</span>
                <span className="text-xs text-gray-500">開啟此選項，出貨選單將顯示黑貓物流。</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={enableTCat} onChange={e => setEnableTCat(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            <ToggleRow
              title="台灣宅配通 (Pelican)"
              description="開啟此選項，出貨選單將顯示台灣宅配通。"
              checked={enablePelican}
              onChange={setEnablePelican}
              className="bg-gray-50 border-gray-100"
            />
            
            <ToggleRow
              title="綠界科技 ECPay 店到店"
              description="開啟此選項，出貨選單將顯示綠界店到店交貨便。"
              checked={enableECPay}
              onChange={setEnableECPay}
              className="bg-gray-50 border-gray-100"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-4">
          <ToggleRow
            title={t('settingsOrder.allowGuestCheckout')}
            description={t('settingsOrder.guestCheckoutDesc')}
            checked={allowGuestCheckout}
            onChange={setAllowGuestCheckout}
            className="bg-blue-50 border-blue-100"
          />

          <ToggleRow
            title={t('settingsOrder.enableCounterDashboard')}
            description={t('settingsOrder.counterDashboardDesc')}
            checked={enableCounterDisplay}
            onChange={setEnableCounterDisplay}
            className="bg-purple-50 border-purple-100"
          />

          <ToggleRow
            title={t('settingsOrder.allowScheduledOrders')}
            checked={enableFutureOrdering}
            onChange={setEnableFutureOrdering}
            className="bg-transparent border-none p-2"
          />

          {enableFutureOrdering && (
            <div className="ml-7 p-4 bg-blue-50/50 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">{t('settingsOrder.bufferAfterOpening')}</label>
                <input 
                  type="number" 
                  value={preOpeningBuffer} 
                  onChange={(e) => setPreOpeningBuffer(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-blue-600 mt-1">{t('settingsOrder.bufferAfterOpeningDesc')}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">{t('settingsOrder.bufferBeforeClosing')}</label>
                <input 
                  type="number" 
                  value={postClosingBuffer} 
                  onChange={(e) => setPostClosingBuffer(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-blue-600 mt-1">{t('settingsOrder.bufferBeforeClosingDesc')}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">{t('settingsOrder.scheduledTimeInterval')}</label>
                <select 
                  value={timeSlotInterval} 
                  onChange={(e) => setTimeSlotInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value={5}>{t('settingsOrder.fiveMinutes')}</option>
                  <option value={10}>{t('settingsOrder.tenMinutes')}</option>
                  <option value={15}>{t('settingsOrder.fifteenMinutes')}</option>
                  <option value={20}>{t('settingsOrder.twentyMinutes')}</option>
                  <option value={30}>{t('settingsOrder.thirtyMinutes')}</option>
                  <option value={60}>{t('settingsOrder.sixtyMinutes')}</option>
                </select>
                <p className="text-[10px] text-blue-600 mt-1">{t('settingsOrder.timeIntervalSelection')}</p>
              </div>
            </div>
          )}

          <ToggleRow
            title={t('settingsOrder.enableTipping')}
            checked={enableTipping}
            onChange={setEnableTipping}
            className="bg-transparent border-none p-2"
          />

          <div className={!enableTipping ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsOrder.tipPercentageOptions')}</label>
            <input type="text" value={tipOptionsStr} onChange={(e) => setTipOptionsStr(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="10,15,20,25" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsOrder.taxRate')}</label>
            <input type="number" min={0} max={100} step={0.01} value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>

          <div className="p-5 bg-orange-50/30 rounded-xl border border-orange-100/50 space-y-4">
            <h3 className="text-sm font-bold text-orange-950 flex items-center gap-1.5">
              <span>{t('settingsOrder.loyaltyProgramSettings')}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-orange-900 mb-1">{t('settingsOrder.pointsRewardRate')}</label>
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
                  {t('settingsOrder.pointsRewardDescription')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-orange-900 mb-1">{t('settingsOrder.pointsRedemptionRate')}</label>
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
                  {t('settingsOrder.pointsRedemptionDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <label className="block text-sm font-bold text-orange-800 mb-1">{t('settingsOrder.boardDisplayLeadTime')}</label>
            <input 
              type="number" 
              min={0} 
              max={1440} 
              value={boardLeadTime} 
              onChange={(e) => setBoardLeadTime(parseInt(e.target.value) || 0)} 
              className="w-full max-w-xs px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" 
            />
            <p className="text-xs text-orange-600 mt-2">
              {t('settingsOrder.boardLeadTimeDescription')}
              <br />
              {t('settingsOrder.boardLeadTimeExample')}
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
            {saving ? t('settingsOrder.saving') : t('settingsOrder.saveAllChanges')}
          </button>
        </div>
    </div>
  );
}

