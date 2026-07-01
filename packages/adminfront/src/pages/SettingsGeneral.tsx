import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';

export default function SettingsGeneral() {
  const { t } = useTranslation();
    const TIMEZONES = [
      { value: 'Asia/Taipei', label: t('autoGen.admin.key1276') },
      { value: 'UTC', label: t('autoGen.admin.key1277') },
      { value: 'Asia/Tokyo', label: t('autoGen.admin.key1278') },
      { value: 'Asia/Shanghai', label: t('autoGen.admin.key1279') },
      { value: 'Asia/Hong_Kong', label: t('autoGen.admin.key1280') },
      { value: 'Asia/Singapore', label: t('autoGen.admin.key1281') },
      { value: 'Asia/Dubai', label: t('autoGen.admin.key1282') },
      { value: 'Asia/Kolkata', label: t('autoGen.admin.key1283') },
      { value: 'Europe/London', label: t('autoGen.admin.key1284') },
      { value: 'Europe/Berlin', label: t('autoGen.admin.key1285') },
      { value: 'Europe/Paris', label: t('autoGen.admin.key1286') },
      { value: 'Europe/Rome', label: t('autoGen.admin.key1287') },
      { value: 'America/New_York', label: t('autoGen.admin.key1288') },
      { value: 'America/Chicago', label: t('autoGen.admin.key1289') },
      { value: 'America/Denver', label: t('autoGen.admin.key1290') },
      { value: 'America/Los_Angeles', label: t('autoGen.admin.key1291') },
      { value: 'Australia/Sydney', label: t('autoGen.admin.key1292') },
      { value: 'Pacific/Auckland', label: t('autoGen.admin.key1293') },
    ];

  const { user, refreshUser } = useAuth();
  const { i18n } = useTranslation();
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState(user?.preferredLanguage || i18n.language || 'zh-TW');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('before');
  const [currencyDecimals, setCurrencyDecimals] = useState<number>(2);
  const [navShowHome, setNavShowHome] = useState(true);
  const [navShowLocations, setNavShowLocations] = useState(true);
  const [navShowMenu, setNavShowMenu] = useState(true);
  const [navShowReservations, setNavShowReservations] = useState(true);
  const [showMembership, setShowMembership] = useState(true);
  const [showLanguageEmoji, setShowLanguageEmoji] = useState(false);

  useEffect(() => {
    if (user?.preferredLanguage) {
      setLanguage(user.preferredLanguage);
    }
  }, [user?.preferredLanguage]);

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
          if (d.currencyDecimals !== undefined) setCurrencyDecimals(d.currencyDecimals);
          if (d.navShowHome !== undefined) setNavShowHome(d.navShowHome);
          if (d.navShowLocations !== undefined) setNavShowLocations(d.navShowLocations);
          if (d.navShowMenu !== undefined) setNavShowMenu(d.navShowMenu);
          if (d.navShowReservations !== undefined) setNavShowReservations(d.navShowReservations);
          if (d.showMembership !== undefined) setShowMembership(d.showMembership);
          if (d.showLanguageEmoji !== undefined) setShowLanguageEmoji(d.showLanguageEmoji);
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
      const p1 = fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contactEmail, contactPhone, timezone, distanceUnit, defaultCurrency,
          currencySymbol, currencyPosition, currencyDecimals,
          navShowHome, navShowLocations, navShowMenu, navShowReservations, showMembership, showLanguageEmoji
        }),
      });

      const p2 = fetch('/api/auth/me/language', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language }),
      });

      const [res, langRes] = await Promise.all([p1, p2]);
      const data = await res.json();
      
      if (data.success) {
        if (langRes.ok) {
          i18n.changeLanguage(language);
          if (refreshUser) refreshUser();
        }
        setSuccess(t('autoGen.admin.key1294'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('autoGen.admin.key1295'));
      }
    } catch {
      setError(t('autoGen.admin.key1296'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('autoGen.admin.key1297')}</div>;
  return (
    <div className="pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">{t('autoGen.admin.key1298')}</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('autoGen.admin.key1299')}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? t('autoGen.admin.key1300') : t('autoGen.admin.key1301')}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="space-y-6">
        {/* Personal Preference */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('autoGen.admin.key1302')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1303')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('autoGen.admin.key1304')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1305')}</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1306')}</label>
              <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* Site Navigation & Membership */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('autoGen.admin.key1307')}</h2>
          <p className="text-sm text-gray-500">{t('autoGen.admin.key1308')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key1309')}</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowHome} onChange={(e) => setNavShowHome(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">{t('autoGen.admin.key1310')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowLocations} onChange={(e) => setNavShowLocations(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">{t('autoGen.admin.key1311')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowMenu} onChange={(e) => setNavShowMenu(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">{t('autoGen.admin.key1312')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={navShowReservations} onChange={(e) => setNavShowReservations(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">{t('autoGen.admin.key1313')}</span>
              </label>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key1314')}</h3>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="checkbox" checked={showMembership} onChange={(e) => setShowMembership(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{t('autoGen.admin.key1315')}</p>
                  <p className="text-xs text-gray-500">{t('autoGen.admin.key1316')}</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="checkbox" checked={showLanguageEmoji} onChange={(e) => setShowLanguageEmoji(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{t('autoGen.admin.key1317')}</p>
                  <p className="text-xs text-gray-500">{t('autoGen.admin.key1318')}</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Localization & Currency */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('autoGen.admin.key1319')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1320')}</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1321')}</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="distanceUnit" value="km" checked={distanceUnit === 'km'} onChange={() => setDistanceUnit('km')} className="text-primary-600" />
                  {t('autoGen.admin.key1322')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="distanceUnit" value="mi" checked={distanceUnit === 'mi'} onChange={() => setDistanceUnit('mi')} className="text-primary-600" />
                  {t('autoGen.admin.key1323')}
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1324')}</label>
              <input type="text" maxLength={3} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="TWD" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1325')}</label>
              <input type="text" maxLength={5} value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="$" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1326')}</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="currencyPosition" value="before" checked={currencyPosition === 'before'} onChange={() => setCurrencyPosition('before')} className="text-primary-600" />
                  {t('autoGen.admin.key1327')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="currencyPosition" value="after" checked={currencyPosition === 'after'} onChange={() => setCurrencyPosition('after')} className="text-primary-600" />
                  {t('autoGen.admin.key1328')}
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1329')}</label>
              <select value={currencyDecimals} onChange={(e) => setCurrencyDecimals(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value={0}>{t('autoGen.admin.key1330')}</option>
                <option value={1}>1</option>
                <option value={2}>{t('autoGen.admin.key1331')}</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
          </div>
        </div>

        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? t('autoGen.admin.key1332') : t('autoGen.admin.key1333')}
          </button>
      </div>
    </div>
  );
}
