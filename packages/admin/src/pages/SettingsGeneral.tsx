import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Europe/Rome', 'Europe/Madrid', 'Asia/Tokyo', 'Asia/Taipei', 'Asia/Shanghai', 'Asia/Kolkata',
  'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland',
];

export default function SettingsGeneral() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('before');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [navShowHome, setNavShowHome] = useState(true);
  const [navShowLocations, setNavShowLocations] = useState(true);
  const [navShowMenu, setNavShowMenu] = useState(true);
  const [navShowReservations, setNavShowReservations] = useState(true);
  const [showMembership, setShowMembership] = useState(true);

  useEffect(() => {
    fetch('/api/settings/general', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.contactEmail) setContactEmail(d.contactEmail);
          if (d.contactPhone) setContactPhone(d.contactPhone);
          if (d.timezone) setTimezone(d.timezone);
          if (d.distanceUnit) setDistanceUnit(d.distanceUnit);
          if (d.defaultCurrency) setDefaultCurrency(d.defaultCurrency);
          if (d.currencySymbol) setCurrencySymbol(d.currencySymbol);
          if (d.currencyPosition) setCurrencyPosition(d.currencyPosition);
          if (d.googleMapsApiKey) setGoogleMapsApiKey(d.googleMapsApiKey);
          if (d.navShowHome !== undefined) setNavShowHome(d.navShowHome);
          if (d.navShowLocations !== undefined) setNavShowLocations(d.navShowLocations);
          if (d.navShowMenu !== undefined) setNavShowMenu(d.navShowMenu);
          if (d.navShowReservations !== undefined) setNavShowReservations(d.navShowReservations);
          if (d.showMembership !== undefined) setShowMembership(d.showMembership);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contactEmail, contactPhone, timezone, distanceUnit, defaultCurrency,
          currencySymbol, currencyPosition, googleMapsApiKey,
          navShowHome, navShowLocations, navShowMenu, navShowReservations, showMembership
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('General settings updated');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;
  return (
    <div className="pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; 返回設定</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">一般設定</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="space-y-6">
        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">聯絡資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電子郵件</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話</label>
              <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* Site Navigation & Membership */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">網站導覽與功能開關</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">顯示導覽連結</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowHome} onChange={(e) => setNavShowHome(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">顯示「首頁」</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowLocations} onChange={(e) => setNavShowLocations(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">顯示「分店資訊」</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowMenu} onChange={(e) => setNavShowMenu(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">顯示「線上點餐」</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowReservations} onChange={(e) => setNavShowReservations(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">顯示「訂位服務」</span>
              </label>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">系統功能</h3>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="checkbox" checked={showMembership} onChange={(e) => setShowMembership(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <div>
                  <p className="text-sm font-bold text-gray-900">啟用會員系統</p>
                  <p className="text-xs text-gray-500">關閉後將隱藏登入/註冊按鈕</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Localization & Currency */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">區域與貨幣</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">時區</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">距離單位</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="distanceUnit" value="km" checked={distanceUnit === 'km'} onChange={() => setDistanceUnit('km')} className="text-primary-600" />
                  公里 (km)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="distanceUnit" value="mi" checked={distanceUnit === 'mi'} onChange={() => setDistanceUnit('mi')} className="text-primary-600" />
                  英里 (mi)
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預設幣別</label>
              <input type="text" maxLength={3} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="TWD" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">貨幣符號</label>
              <input type="text" maxLength={5} value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="$" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">符號位置</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="currencyPosition" value="before" checked={currencyPosition === 'before'} onChange={() => setCurrencyPosition('before')} className="text-primary-600" />
                  前方 ($10)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="currencyPosition" value="after" checked={currencyPosition === 'after'} onChange={() => setCurrencyPosition('after')} className="text-primary-600" />
                  後方 (10$)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">進階設定</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps API 金鑰</label>
            <input type="password" value={googleMapsApiKey} onChange={(e) => setGoogleMapsApiKey(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="輸入 API 金鑰" />
          </div>
        </div>
      </div>
    </div>
  );
}
