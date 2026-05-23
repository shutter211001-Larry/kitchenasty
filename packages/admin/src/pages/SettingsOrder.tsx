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
  const [preOpeningBuffer, setPreOpeningBuffer] = useState(30);
  const [postClosingBuffer, setPostClosingBuffer] = useState(30);
  const [timeSlotInterval, setTimeSlotInterval] = useState(15);
  const [enableTipping, setEnableTipping] = useState(false);
  const [tipOptionsStr, setTipOptionsStr] = useState('10,15,20,25');
  const [taxRate, setTaxRate] = useState(0);
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
          if (d.allowGuestCheckout !== undefined) setAllowGuestCheckout(d.allowGuestCheckout);
          if (d.minOrderDelivery !== undefined) setMinOrderDelivery(d.minOrderDelivery);
          if (d.minOrderPickup !== undefined) setMinOrderPickup(d.minOrderPickup);
          if (d.deliveryLeadTime !== undefined) setDeliveryLeadTime(d.deliveryLeadTime);
          if (d.pickupLeadTime !== undefined) setPickupLeadTime(d.pickupLeadTime);
          if (d.enableFutureOrdering !== undefined) setEnableFutureOrdering(d.enableFutureOrdering);
          if (d.preOpeningBuffer !== undefined) setPreOpeningBuffer(d.preOpeningBuffer);
          if (d.postClosingBuffer !== undefined) setPostClosingBuffer(d.postClosingBuffer);
          if (d.timeSlotInterval !== undefined) setTimeSlotInterval(d.timeSlotInterval);
          if (d.enableTipping !== undefined) setEnableTipping(d.enableTipping);
          if (d.enableCounterDisplay !== undefined) setEnableCounterDisplay(d.enableCounterDisplay);
          if (d.tipOptions) setTipOptionsStr(d.tipOptions.join(','));
          if (d.taxRate !== undefined) setTaxRate(d.taxRate);
          if (d.boardLeadTime !== undefined) setBoardLeadTime(d.boardLeadTime);
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
          allowGuestCheckout,
          minOrderDelivery, 
          minOrderPickup, 
          deliveryLeadTime, 
          pickupLeadTime, 
          enableFutureOrdering, 
          preOpeningBuffer,
          postClosingBuffer,
          timeSlotInterval,
          enableTipping, 
          enableCounterDisplay,
          tipOptions, 
          taxRate,
          boardLeadTime,
          emailNotifications 
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
          <h1 className="text-2xl font-bold text-gray-900 mt-1">線上點餐總設定</h1>
          <p className="text-sm text-gray-500 mt-1">這裡控制全站點餐功能與預設值；各門市仍可在門市設定中覆寫外送、自取、最低消與準備時間。</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">開啟全站線上點餐功能</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">全站允許「外送」服務</span>
              </label>
              <div className={!deliveryEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">預設外送最低消費金額 ($)</label>
                <input type="number" min={0} step={0.01} value={minOrderDelivery} onChange={(e) => setMinOrderDelivery(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">預設外送預估時間 (分鐘)</label>
                <input type="number" min={0} value={deliveryLeadTime} onChange={(e) => setDeliveryLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <p className="text-[10px] text-gray-500 mt-2">門市或外送區域有設定時，會優先使用更細的設定。</p>
              </div>
            </div>

            <div className="space-y-4 border-l border-gray-200 pl-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-bold text-gray-900">全站允許「自取」服務</span>
              </label>
              <div className={!pickupEnabled ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs text-gray-500 mb-1">預設自取最低消費金額 ($)</label>
                <input type="number" min={0} step={0.01} value={minOrderPickup} onChange={(e) => setMinOrderPickup(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <label className="block text-xs text-gray-500 mt-3 mb-1">預設自取準備時間 (分鐘)</label>
                <input type="number" min={0} value={pickupLeadTime} onChange={(e) => setPickupLeadTime(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                <p className="text-[10px] text-gray-500 mt-2">門市有設定時，會優先使用門市準備時間。</p>
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

          <label className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 cursor-pointer">
            <input type="checkbox" checked={enableCounterDisplay} onChange={(e) => setEnableCounterDisplay(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <div>
              <p className="text-sm font-bold text-gray-900">啟用「櫃台看板」功能</p>
              <p className="text-xs text-gray-500">在側邊欄開啟櫃台專用的看板，可顯示顧客姓名與聯絡電話以利配餐</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={enableFutureOrdering} onChange={(e) => setEnableFutureOrdering(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">允許預約未來訂單 (Scheduled orders)</span>
          </label>

          {enableFutureOrdering && (
            <div className="ml-7 p-4 bg-blue-50/50 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">開店後緩衝 (分鐘)</label>
                <input 
                  type="number" 
                  value={preOpeningBuffer} 
                  onChange={(e) => setPreOpeningBuffer(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-blue-600 mt-1">例如：11:00開門，設30則11:30才準取餐</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">打烊前緩衝 (分鐘)</label>
                <input 
                  type="number" 
                  value={postClosingBuffer} 
                  onChange={(e) => setPostClosingBuffer(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-blue-600 mt-1">例如：21:00打烊，設30則20:30後不準預約</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">預約時段間隔 (分鐘)</label>
                <select 
                  value={timeSlotInterval} 
                  onChange={(e) => setTimeSlotInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value={5}>5 分鐘</option>
                  <option value={10}>10 分鐘</option>
                  <option value={15}>15 分鐘</option>
                  <option value={20}>20 分鐘</option>
                  <option value={30}>30 分鐘</option>
                  <option value={60}>60 分鐘</option>
                </select>
                <p className="text-[10px] text-blue-600 mt-1">客人選時間的跳動間隔</p>
              </div>
            </div>
          )}

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

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <label className="block text-sm font-bold text-orange-800 mb-1">看板顯示提前量 (分鐘)</label>
            <input 
              type="number" 
              min={0} 
              max={1440} 
              value={boardLeadTime} 
              onChange={(e) => setBoardLeadTime(parseInt(e.target.value) || 0)} 
              className="w-full max-w-xs px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" 
            />
            <p className="text-xs text-orange-600 mt-2">
              設定預約訂單在取餐前多久會自動出現在看板的狀態欄位（待處理/製作中）中。
              <br />
              例如：設定 60 分鐘，則 12:00 取餐的訂單會在 11:00 出現在看板上。
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
            {saving ? '儲存中...' : '儲存所有變更'}
          </button>
        </div>
    </div>
  );
}

