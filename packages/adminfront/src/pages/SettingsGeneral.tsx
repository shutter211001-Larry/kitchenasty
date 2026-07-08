import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { ToggleRow } from '../components/ui/ToggleRow';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

export default function SettingsGeneral() {
  const { t } = useTranslation();
    const TIMEZONES = [
      { value: 'Asia/Taipei', label: t('settingsGeneral.timezoneTaipei') },
      { value: 'UTC', label: t('settingsGeneral.timezoneUtc') },
      { value: 'Asia/Tokyo', label: t('settingsGeneral.timezoneTokyo') },
      { value: 'Asia/Shanghai', label: t('settingsGeneral.timezoneShanghaiBeijing') },
      { value: 'Asia/Hong_Kong', label: t('settingsGeneral.timezoneHongKong') },
      { value: 'Asia/Singapore', label: t('settingsGeneral.timezoneSingapore') },
      { value: 'Asia/Dubai', label: t('settingsGeneral.timezoneDubai') },
      { value: 'Asia/Kolkata', label: t('settingsGeneral.timezoneIndia') },
      { value: 'Europe/London', label: t('settingsGeneral.timezoneLondon') },
      { value: 'Europe/Berlin', label: t('settingsGeneral.timezoneBerlin') },
      { value: 'Europe/Paris', label: t('settingsGeneral.timezoneParis') },
      { value: 'Europe/Rome', label: t('settingsGeneral.timezoneRome') },
      { value: 'America/New_York', label: t('settingsGeneral.timezoneNewYork') },
      { value: 'America/Chicago', label: t('settingsGeneral.timezoneChicago') },
      { value: 'America/Denver', label: t('settingsGeneral.timezoneDenver') },
      { value: 'America/Los_Angeles', label: t('settingsGeneral.timezoneLosAngeles') },
      { value: 'Australia/Sydney', label: t('settingsGeneral.timezoneSydney') },
      { value: 'Pacific/Auckland', label: t('settingsGeneral.timezoneAuckland') },
    ];

  const { user, refreshUser } = useAuth();
  const { i18n } = useTranslation();
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [domain, setDomain] = useState('');
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
          if (d.domain) setDomain(d.domain);
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
          domain, contactEmail, contactPhone, timezone, distanceUnit, defaultCurrency,
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
        setSuccess(t('settingsGeneral.settingsUpdatedSuccessfully'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('settingsGeneral.saveFailed'));
      }
    } catch {
      setError(t('settingsGeneral.networkConnectionError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('settingsGeneral.loading')}</div>;

  const actionButton = (
    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
      {saving ? t('settingsGeneral.saving') : t('settingsGeneral.saveChanges')}
    </button>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('settingsGeneral.generalSettings')}
        backUrl="/settings"
        backText={t('settingsGeneral.backToSettings')}
        action={actionButton}
      />

      <PageContent>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        <div className="space-y-6">
        {/* Personal Preference */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('settingsGeneral.personalizationSettings')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.systemDisplayLanguage')}</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none shadow-sm cursor-pointer" value={language} onChange={(e) => setLanguage(e.target.value)}>
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
          <h2 className="text-lg font-semibold text-gray-900">{t('settingsGeneral.contactInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Custom Domain / 專屬網域</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" placeholder="e.g. www.my-restaurant.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
              <p className="mt-1 text-xs text-gray-500">
                設定您的專屬網域。留空則使用預設子網域。
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.contactEmail')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.contactPhone')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Site Navigation & Membership */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('settingsGeneral.navigationPortalDisplay')}</h2>
          <p className="text-sm text-gray-500">{t('settingsGeneral.portalDisplayDescription')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('settingsGeneral.showNavigationLinks')}</h3>
              <ToggleRow
                title={t('settingsGeneral.showHomePage')}
                checked={navShowHome}
                onChange={setNavShowHome}
                className="bg-transparent border-none p-2"
              />
              <ToggleRow
                title={t('settingsGeneral.showBranchInfo')}
                checked={navShowLocations}
                onChange={setNavShowLocations}
                className="bg-transparent border-none p-2"
              />
              <ToggleRow
                title={t('settingsGeneral.showOnlineOrdering')}
                checked={navShowMenu}
                onChange={setNavShowMenu}
                className="bg-transparent border-none p-2"
              />
              <ToggleRow
                title={t('settingsGeneral.showBookingService')}
                checked={navShowReservations}
                onChange={setNavShowReservations}
                className="bg-transparent border-none p-2"
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('settingsGeneral.systemFeatures')}</h3>
              <ToggleRow
                title={t('settingsGeneral.enableMemberSystem')}
                description={t('settingsGeneral.hideLoginRegisterDescription')}
                checked={showMembership}
                onChange={setShowMembership}
              />
              <ToggleRow
                title={t('settingsGeneral.showLanguageFlagEmoji')}
                description={t('settingsGeneral.showFlagIconDescription')}
                checked={showLanguageEmoji}
                onChange={setShowLanguageEmoji}
              />
            </div>
          </div>
        </div>

        {/* Localization & Currency */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('settingsGeneral.regionAndCurrency')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.timezone')}</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none shadow-sm cursor-pointer" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.distanceUnit')}</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="distanceUnit" value="km" checked={distanceUnit === 'km'} onChange={() => setDistanceUnit('km')} className="text-primary-600" />
                  {t('settingsGeneral.kilometers')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="distanceUnit" value="mi" checked={distanceUnit === 'mi'} onChange={() => setDistanceUnit('mi')} className="text-primary-600" />
                  {t('settingsGeneral.miles')}
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.defaultCurrency')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" maxLength={3} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())} placeholder="TWD" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.currencySymbol')}</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" maxLength={5} value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} placeholder="$" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.symbolPosition')}</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="currencyPosition" value="before" checked={currencyPosition === 'before'} onChange={() => setCurrencyPosition('before')} className="text-primary-600" />
                  {t('settingsGeneral.prefixSymbol')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="currencyPosition" value="after" checked={currencyPosition === 'after'} onChange={() => setCurrencyPosition('after')} className="text-primary-600" />
                  {t('settingsGeneral.suffixSymbol')}
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsGeneral.checkoutDecimalPlaces')}</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none shadow-sm cursor-pointer" value={currencyDecimals} onChange={(e) => setCurrencyDecimals(Number(e.target.value))}>
                <option value={0}>{t('settingsGeneral.decimalPlacesZero')}</option>
                <option value={1}>1</option>
                <option value={2}>{t('settingsGeneral.decimalPlacesTwo')}</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
          </div>
        </div>

        </div>
      </PageContent>
    </div>
  );
}
