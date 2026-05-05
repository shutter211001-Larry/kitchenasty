import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsOrder() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [allowGuestCheckout, setAllowGuestCheckout] = useState(true);
  const [minOrderDelivery, setMinOrderDelivery] = useState(0);
  const [minOrderPickup, setMinOrderPickup] = useState(0);
  const [deliveryLeadTime, setDeliveryLeadTime] = useState(30);
  const [pickupLeadTime, setPickupLeadTime] = useState(15);
  const [enableFutureOrdering, setEnableFutureOrdering] = useState(false);
  const [enableTipping, setEnableTipping] = useState(false);
  const [tipOptionsStr, setTipOptionsStr] = useState('10,15,20,25');
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    fetch('/api/settings/order', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.enabled !== undefined) setEnabled(d.enabled);
          if (d.deliveryEnabled !== undefined) setDeliveryEnabled(d.deliveryEnabled);
          if (d.pickupEnabled !== undefined) setPickupEnabled(d.pickupEnabled);
          if (d.allowGuestCheckout !== undefined) setAllowGuestCheckout(d.allowGuestCheckout);
          if (d.minOrderDelivery !== undefined) setMinOrderDelivery(d.minOrderDelivery);
          if (d.minOrderPickup !== undefined) setMinOrderPickup(d.minOrderPickup);
          if (d.deliveryLeadTime !== undefined) setDeliveryLeadTime(d.deliveryLeadTime);
          if (d.pickupLeadTime !== undefined) setPickupLeadTime(d.pickupLeadTime);
          if (d.enableFutureOrdering !== undefined) setEnableFutureOrdering(d.enableFutureOrdering);
          if (d.enableTipping !== undefined) setEnableTipping(d.enableTipping);
          if (d.tipOptions) setTipOptionsStr(d.tipOptions.join(','));
          if (d.taxRate !== undefined) setTaxRate(d.taxRate);
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
          allowGuestCheckout,
          minOrderDelivery, 
          minOrderPickup, 
          deliveryLeadTime, 
          pickupLeadTime, 
          enableFutureOrdering, 
          enableTipping, 
          tipOptions, 
          taxRate 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('訂單設定已更新');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : '儲存失敗');
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; 返回設定</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">訂單與外送設定</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">開啟線上點餐功能</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">啟用「外送」服務</span>
              </label>
              <div className={!deliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">外送最低消費金額 ($)</label>
                <input type="number" min={0} step={0.01} value={minOrderDelivery} onChange={(e) => setMinOrderDelivery(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">外送預估時間 (分鐘)</label>
                <input type="number" min={0} value={deliveryLeadTime} onChange={(e) => setDeliveryLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">啟用「自取」服務</span>
              </label>
              <div className={!pickupEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">自取最低消費金額 ($)</label>
                <input type="number" min={0} step={0.01} value={minOrderPickup} onChange={(e) => setMinOrderPickup(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">自取準備時間 (分鐘)</label>
                <input type="number" min={0} value={pickupLeadTime} onChange={(e) => setPickupLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-4">
          <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer">
            <input type="checkbox" checked={allowGuestCheckout} onChange={(e) => setAllowGuestCheckout(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <div>
              <p className="text-sm font-bold text-gray-900">允許訪客結帳 (不強制加入會員)</p>
              <p className="text-xs text-gray-500">開啟後，客人不需要登入帳號即可直接點餐結帳</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enableFutureOrdering} onChange={(e) => setEnableFutureOrdering(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">允許預約未來訂單 (Scheduled orders)</span>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enableTipping} onChange={(e) => setEnableTipping(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">啟用小費功能</span>
          </label>

          <div className={!enableTipping ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">小費選項 (百分比，以逗號分隔)</label>
            <input type="text" value={tipOptionsStr} onChange={(e) => setTipOptionsStr(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="10,15,20,25" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">稅率 (%)</label>
            <input type="number" min={0} max={100} step={0.01} value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
