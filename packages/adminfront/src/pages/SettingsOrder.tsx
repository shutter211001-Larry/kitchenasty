import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToggleRow } from '../components/ui/ToggleRow.js';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { api } from '../lib/api.js';

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
  const [enableCapacityLimit, setEnableCapacityLimit] = useState(true);
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
  const [tcatCustomerId, setTcatCustomerId] = useState('');
  const [tcatApiKey, setTcatApiKey] = useState('');

  const [enablePelican, setEnablePelican] = useState(false);
  const [pelicanMerchantId, setPelicanMerchantId] = useState('');
  const [pelicanApiKey, setPelicanApiKey] = useState('');

  const [enableECPay, setEnableECPay] = useState(false);
  const [ecpayMerchantId, setEcpayMerchantId] = useState('');
  const [ecpayHashKey, setEcpayHashKey] = useState('');
  const [ecpayHashIv, setEcpayHashIv] = useState('');
  const [enableCapacityLimit, setEnableCapacityLimit] = useState(true);

  useEffect(() => {
    api.get('settings/order')
      
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
          if (d.tcatCustomerId !== undefined) setTcatCustomerId(d.tcatCustomerId);
          if (d.tcatApiKey !== undefined) setTcatApiKey(d.tcatApiKey);
          if (d.enablePelican !== undefined) setEnablePelican(d.enablePelican);
          if (d.pelicanMerchantId !== undefined) setPelicanMerchantId(d.pelicanMerchantId);
          if (d.pelicanApiKey !== undefined) setPelicanApiKey(d.pelicanApiKey);
          if (d.enableECPay !== undefined) setEnableECPay(d.enableECPay);
          if (d.ecpayMerchantId !== undefined) setEcpayMerchantId(d.ecpayMerchantId);
          if (d.ecpayHashKey !== undefined) setEcpayHashKey(d.ecpayHashKey);
          if (d.ecpayHashIv !== undefined) setEcpayHashIv(d.ecpayHashIv);
          if (d.deliveryLeadTime !== undefined) setDeliveryLeadTime(d.deliveryLeadTime);
          if (d.pickupLeadTime !== undefined) setPickupLeadTime(d.pickupLeadTime);
          if (d.frozenLeadTime !== undefined) setFrozenLeadTime(d.frozenLeadTime);
          if (d.frozenDeliveryFee !== undefined) setFrozenDeliveryFee(d.frozenDeliveryFee);
          if (d.enableFutureOrdering !== undefined) setEnableFutureOrdering(d.enableFutureOrdering);
          if (d.enableCapacityLimit !== undefined) setEnableCapacityLimit(d.enableCapacityLimit);
          if (d.preOpeningBuffer !== undefined) setPreOpeningBuffer(d.preOpeningBuffer);
          if (d.postClosingBuffer !== undefined) setPostClosingBuffer(d.postClosingBuffer);
          if (d.timeSlotInterval !== undefined) setTimeSlotInterval(d.timeSlotInterval);
          if (d.enableTipping !== undefined) setEnableTipping(d.enableTipping);
          if (d.enableCounterDisplay !== undefined) setEnableCounterDisplay(d.enableCounterDisplay);
          if (d.enableCapacityLimit !== undefined) setEnableCapacityLimit(d.enableCapacityLimit);
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
      const res = await api.put('settings/order', JSON.stringify({ 
          enabled, 
          deliveryEnabled, 
          pickupEnabled, 
          frozenDeliveryEnabled,
          allowGuestCheckout,
          minOrderDelivery, 
          minOrderPickup, 
          minOrderFrozen,
          pickupLeadTime, 
          frozenLeadTime,
          frozenDeliveryFee, 
          enableFutureOrdering, 
          enableCapacityLimit,
          preOpeningBuffer,
          postClosingBuffer,
          timeSlotInterval,
          enableCapacityLimit,
          enableTipping, 
          enableCounterDisplay,
          tipOptions, 
          taxRate,
          boardLeadTime,
          loyaltyEarnRate,
          loyaltyRedeemRate,
          enableTCat,
          tcatCustomerId,
          tcatApiKey,
          enablePelican,
          pelicanMerchantId,
          pelicanApiKey,
          enableECPay,
          ecpayMerchantId,
          ecpayHashKey,
          ecpayHashIv,
          deliveryLeadTime: Number(deliveryLeadTime),
          emailNotifications 
        }));
      const data = res;
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

  const actionButton = (
    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
      {saving ? t('settingsOrder.savingInProgress') : t('settingsOrder.saveChanges')}
    </button>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('settingsOrder.onlineOrderingGeneralSettings')}
        subtitle={t('settingsOrder.onlineOrderingSettingsDesc')}
        backUrl="/settings"
        backText={t('common.back')}
        action={actionButton}
      />

      <PageContent>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        <div className="space-y-6">
          <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">{t('settingsOrder.enableSiteWideOnlineOrdering')}</span>
          </label>
          
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enableCapacityLimit} onChange={(e) => setEnableCapacityLimit(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">智慧產能排單 (Smart Capacity Scheduling)</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('settingsOrder.enableDeliveryService')}</span>
              </label>
              <div className={!deliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.defaultDeliveryMinSpend')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} step={0.01} value={minOrderDelivery} onChange={(e) => setMinOrderDelivery(parseFloat(e.target.value) || 0)} />
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.defaultDeliveryEstimatedTime')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} value={deliveryLeadTime} onChange={(e) => setDeliveryLeadTime(parseInt(e.target.value) || 0)} />
                <p className="text-[10px] text-gray-500 mt-2">{t('settingsOrder.overridePriorityDesc')}</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('settingsOrder.enablePickupService')}</span>
              </label>
              <div className={!pickupEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.defaultPickupMinSpend')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} step={0.01} value={minOrderPickup} onChange={(e) => setMinOrderPickup(parseFloat(e.target.value) || 0)} />
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.defaultPickupPrepTime')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} value={pickupLeadTime} onChange={(e) => setPickupLeadTime(parseInt(e.target.value) || 0)} />
                <p className="text-[10px] text-gray-500 mt-2">{t('settingsOrder.storePrepTimeDesc')}</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={frozenDeliveryEnabled} onChange={(e) => setFrozenDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">{t('settingsOrder.enableFrozenDeliveryService')}</span>
              </label>
              <div className={!frozenDeliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.defaultFrozenDeliveryMinSpend')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} step={0.01} value={minOrderFrozen} onChange={(e) => setMinOrderFrozen(parseFloat(e.target.value) || 0)} />
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.defaultFrozenDeliveryPrepTime')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} value={frozenLeadTime} onChange={(e) => setFrozenLeadTime(parseInt(e.target.value) || 0)} />
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.frozenDeliveryBaseFee')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} step={0.01} value={frozenDeliveryFee} onChange={(e) => setFrozenDeliveryFee(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        </div>

        {/* Logistics Channels */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">物流通道預留設定 (Logistics API Channels)</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded">Future API</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">這些開關將控制出貨選項。當您取得第三方物流 API 金鑰後，可以開啟對應通道，讓店員看見出貨選項。</p>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <ToggleRow
                title="統一速達 黑貓宅急便 (TCat)"
                description="開啟此選項，出貨選單將顯示黑貓宅急便。"
                checked={enableTCat}
                onChange={setEnableTCat}
                className="bg-transparent border-none p-0 mb-4"
              />
              {enableTCat && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer ID (客戶代號)</label>
                    <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={tcatCustomerId} onChange={e => setTcatCustomerId(e.target.value)} placeholder="Enter Customer ID" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Key (客戶金鑰)</label>
                    <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={tcatApiKey} onChange={e => setTcatApiKey(e.target.value)} placeholder="Enter API Key" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <ToggleRow
                title="台灣宅配通 (Pelican)"
                description="開啟此選項，出貨選單將顯示台灣宅配通。"
                checked={enablePelican}
                onChange={setEnablePelican}
                className="bg-transparent border-none p-0 mb-4"
              />
              {enablePelican && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Merchant ID (特約商代號)</label>
                    <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={pelicanMerchantId} onChange={e => setPelicanMerchantId(e.target.value)} placeholder="Enter Merchant ID" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Key (介接金鑰)</label>
                    <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={pelicanApiKey} onChange={e => setPelicanApiKey(e.target.value)} placeholder="Enter API Key" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <ToggleRow
                title="綠界科技 ECPay 店到店"
                description="開啟此選項，出貨選單將顯示綠界店到店交貨便。"
                checked={enableECPay}
                onChange={setEnableECPay}
                className="bg-transparent border-none p-0 mb-4"
              />
              {enableECPay && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Merchant ID (特店編號)</label>
                    <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={ecpayMerchantId} onChange={e => setEcpayMerchantId(e.target.value)} placeholder="Enter Merchant ID" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hash Key (介接 HashKey)</label>
                    <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={ecpayHashKey} onChange={e => setEcpayHashKey(e.target.value)} placeholder="Enter Hash Key" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hash IV (介接 HashIV)</label>
                    <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={ecpayHashIv} onChange={e => setEcpayHashIv(e.target.value)} placeholder="Enter Hash IV" />
                  </div>
                </div>
              )}
            </div>
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

          <ToggleRow
            title={t('settingsOrder.enableCapacityLimit') || '啟用智能產能控制 (防爆單)'}
            description={t('settingsOrder.enableCapacityLimitDesc') || '根據餐點的製作時間與設定的取餐間隔，自動控管並關閉超出產能的時段。同時預測現場等候時間。'}
            checked={enableCapacityLimit}
            onChange={setEnableCapacityLimit}
            className="bg-transparent border-none p-2"
          />

          {enableFutureOrdering && (
            <div className="ml-7 p-4 bg-blue-50/50 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.bufferAfterOpening')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" value={preOpeningBuffer} onChange={(e) => setPreOpeningBuffer(parseInt(e.target.value) || 0)} placeholder="30" />
                <p className="text-[10px] text-blue-600 mt-1">{t('settingsOrder.bufferAfterOpeningDesc')}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.bufferBeforeClosing')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" value={postClosingBuffer} onChange={(e) => setPostClosingBuffer(parseInt(e.target.value) || 0)} placeholder="30" />
                <p className="text-[10px] text-blue-600 mt-1">{t('settingsOrder.bufferBeforeClosingDesc')}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.scheduledTimeInterval')}</label>
                <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none shadow-sm cursor-pointer" value={timeSlotInterval} onChange={(e) => setTimeSlotInterval(parseInt(e.target.value))}>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.tipPercentageOptions')}</label>
            <input className="max-w-md w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={tipOptionsStr} onChange={(e) => setTipOptionsStr(e.target.value)} placeholder="10,15,20,25" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.taxRate')}</label>
            <input className="max-w-xs w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} max={100} step={0.01} value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} />
          </div>

          <div className="p-5 bg-orange-50/30 rounded-xl border border-orange-100/50 space-y-4">
            <h3 className="text-sm font-bold text-orange-950 flex items-center gap-1.5">
              <span>{t('settingsOrder.loyaltyProgramSettings')}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.pointsRewardRate')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} step={0.1} value={loyaltyEarnRate} onChange={(e) => setLoyaltyEarnRate(parseFloat(e.target.value) || 0)} placeholder="1.0" />
                <p className="text-[10px] text-orange-750 mt-1">
                  {t('settingsOrder.pointsRewardDescription')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.pointsRedemptionRate')}</label>
                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={1} step={1} value={loyaltyRedeemRate} onChange={(e) => setLoyaltyRedeemRate(parseInt(e.target.value) || 100)} placeholder="100" />
                <p className="text-[10px] text-orange-750 mt-1">
                  {t('settingsOrder.pointsRedemptionDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsOrder.boardDisplayLeadTime')}</label>
            <input className="max-w-xs w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="number" min={0} max={1440} value={boardLeadTime} onChange={(e) => setBoardLeadTime(parseInt(e.target.value) || 0)} />
            <p className="text-xs text-orange-600 mt-2">
              {t('settingsOrder.boardLeadTimeDescription')}
              <br />
              {t('settingsOrder.boardLeadTimeExample')}
            </p>
          </div>
        </div>
        </div>
      </PageContent>
    </div>
  );
}
