import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { OpenLocationCode } from 'open-location-code';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';

interface OperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface DeliveryZone {
  id?: string;
  name: string;
  charge: number;
  minOrder: number;
  isActive: boolean;
}

interface LocationData {
  name: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isActive: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  minOrderDelivery: number;
  minOrderPickup: number;
  deliveryLeadTime: number;
  pickupLeadTime: number;
  lat?: number;
  lng?: number;
  hourlyNationalHolidayMultiplier: number;
  monthlyNationalHolidayOvertime: boolean;
  enableOvertimePay: boolean;
  overtimeMultiplier1: number;
  overtimeMultiplier2: number;
  restDayMultiplier: number;
  regularDayMultiplier: number;
}

const defaultHours: OperatingHour[] = Array.from({ length: 7 }).map((_, i: number) => ({
  dayOfWeek: i,
  openTime: '10:00',
  closeTime: '22:00',
  isClosed: false,
}));

const emptyLocation: LocationData = {
  name: '',
  slug: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  isActive: true,
  deliveryEnabled: true,
  pickupEnabled: true,
  minOrderDelivery: 0,
  minOrderPickup: 0,
  deliveryLeadTime: 30,
  pickupLeadTime: 15,
  lat: 0,
  lng: 0,
  hourlyNationalHolidayMultiplier: 2.0,
  monthlyNationalHolidayOvertime: true,
  enableOvertimePay: true,
  overtimeMultiplier1: 1.34,
  overtimeMultiplier2: 1.67,
  restDayMultiplier: 1.34,
  regularDayMultiplier: 2.0,
};

export default function LocationForm() {
  const { t } = useTranslation();
    const DAYS = [t('locationForm.sunday'), t('locationForm.monday'), t('locationForm.tuesday'), t('locationForm.wednesday'), t('locationForm.thursday'), t('locationForm.friday'), t('locationForm.saturday')];

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState<LocationData>(emptyLocation);
  const [hours, setHours] = useState<OperatingHour[]>(defaultHours);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [mapInput, setMapInput] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'hours' | 'hr' | 'delivery'>('basic');

  const handleDelete = async () => {
    if (!window.confirm(t('locationForm.confirmDeleteStore'))) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/locations/${id}`);
      navigate('/locations');
    } catch (err: any) {
      setError(err.message || t('locationForm.deleteFailed'));
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!isEdit) return;
    api.get<{ data: any }>(`/locations/${id}`)
      .then((res) => {
        const loc = res.data;
        setForm({
          name: loc.name,
          slug: loc.slug,
          description: loc.description || '',
          phone: loc.phone || '',
          email: loc.email || '',
          address: loc.address,
          city: loc.city,
          state: loc.state || '',
          postalCode: loc.postalCode,
          country: loc.country,
          isActive: loc.isActive,
          deliveryEnabled: loc.deliveryEnabled,
          pickupEnabled: loc.pickupEnabled,
          minOrderDelivery: loc.minOrderDelivery,
          minOrderPickup: loc.minOrderPickup,
          deliveryLeadTime: loc.deliveryLeadTime,
          pickupLeadTime: loc.pickupLeadTime,
          lat: loc.lat || 0,
          lng: loc.lng || 0,
          hourlyNationalHolidayMultiplier: loc.hourlyNationalHolidayMultiplier ?? 2.0,
          monthlyNationalHolidayOvertime: loc.monthlyNationalHolidayOvertime ?? true,
          enableOvertimePay: loc.enableOvertimePay ?? true,
          overtimeMultiplier1: loc.overtimeMultiplier1 ?? 1.34,
          overtimeMultiplier2: loc.overtimeMultiplier2 ?? 1.67,
          restDayMultiplier: loc.restDayMultiplier ?? 1.34,
          regularDayMultiplier: loc.regularDayMultiplier ?? 2.0,
        });
        if (loc.operatingHours?.length) {
          setHours(loc.operatingHours.map((h: any) => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          })));
        }
        if (loc.deliveryZones?.length) {
          setZones(loc.deliveryZones);
        }
        if (loc.lat || loc.lng) {
          setMapInput(`${loc.lat || 0}, ${loc.lng || 0}`);
        }
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id, isEdit]);

  const updateField = (field: keyof LocationData, value: any) => {
  setForm((prev) => ({ ...prev, [field]: value }));
  };

  const autoSlug = (name: string) => {
    if (!isEdit) {
      updateField('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body = {
        ...form,
        minOrderDelivery: Number(form.minOrderDelivery),
        minOrderPickup: Number(form.minOrderPickup),
        deliveryLeadTime: Number(form.deliveryLeadTime),
        pickupLeadTime: Number(form.pickupLeadTime),
        operatingHours: hours,
      };

      if (isEdit) {
        const { slug: _, ...updateBody } = body;
        await api.patch(`/locations/${id}`, updateBody);
      } else {
        await api.post('/locations', body);
      }
      navigate('/locations');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const addZone = () => {
    setZones((prev) => [...prev, { name: '', charge: 0, minOrder: 0, isActive: true }]);
  };

  const removeZone = (index: number) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMapInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMapInput(val);

    let lat: number | null = null;
    let lng: number | null = null;
    let parsedPlusCode = false;

    try {
      const olc: any = new OpenLocationCode();
      const potentialPlusCode = val.trim().split(/[\s,]+/)[0];
      if (olc.isValid(potentialPlusCode) && olc.isFull(potentialPlusCode)) {
        const decoded = olc.decode(potentialPlusCode);
        lat = decoded.latitudeCenter;
        lng = decoded.longitudeCenter;
        parsedPlusCode = true;
      }
    } catch (err) {
      // Ignore errors if open-location-code fails or is not found
    }

    if (!parsedPlusCode) {
      const match1 = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match1) {
        lat = parseFloat(match1[1]);
        lng = parseFloat(match1[2]);
      } else {
        const match2 = val.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (match2) {
          lat = parseFloat(match2[1]);
          lng = parseFloat(match2[2]);
        } else {
          const match3 = val.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
          if (match3) {
            lat = parseFloat(match3[1]);
            lng = parseFloat(match3[2]);
          }
        }
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      setForm((prev) => ({ ...prev, lat: lat as number, lng: lng as number }));
    } else if (!val.trim()) {
      setForm((prev) => ({ ...prev, lat: 0, lng: 0 }));
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="pb-12">
      <PageHeader
        title={isEdit ? t('locationForm.editStore') : t('locationForm.addStore')}
        backUrl="/locations"
        backText={t('locationForm.backToStoreList')}
      />

      <PageContent>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

            {/* Tabs Layout */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-6 space-x-8">
        {[
          { id: 'basic', label: t('locationForm.basicInformation') || '基本設定' },
          { id: 'hours', label: t('locationForm.businessHoursSettings') || '營業時間' },
          { id: 'hr', label: t('locationForm.humanResources') || '人力資源' },
          { id: 'delivery', label: t('locationForm.deliveryArea') || '外送區域' }
        ].map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-sm font-black whitespace-nowrap transition-all border-b-2 px-1 cursor-pointer ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 scale-105'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {activeTab === 'basic' && (
          <div className="space-y-8 animate-in fade-in duration-300">
        {/* Basic Info */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('locationForm.basicInformation')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.nameRequired')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { updateField('name', e.target.value); autoSlug(e.target.value); }}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.slugRequired')}</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                required
                disabled={isEdit}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.description')}</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.phone')}</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('locationForm.addressInformation')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.detailedAddressRequired')}</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.cityRequired')}</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.stateOrRegion')}</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.postalCodeRequired')}</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.countryCode')}</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.googleMapsUrlOrCoordinates')}</label>
              <input
                type="text"
                value={mapInput}
                onChange={handleMapInputChange}
                placeholder={t('locationForm.googleMapsInputPlaceholder')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {!!(form.lat || form.lng) && (
                 <p className="text-xs text-gray-500 mt-1">{t('locationForm.parsedLatitude')} {form.lat}{t('locationForm.parsedLongitude')} {form.lng}</p>
              )}
            </div>
          </div>
        </section>

        {/* Service Settings */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-1">{t('locationForm.storeServiceSettings')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('locationForm.storeServiceSettingsDescription')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{t('locationForm.isActive')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.deliveryEnabled}
                onChange={(e) => updateField('deliveryEnabled', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{t('locationForm.storeOffersDelivery')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.pickupEnabled}
                onChange={(e) => updateField('pickupEnabled', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{t('locationForm.storeOffersPickup')}</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.storeDeliveryMinimumSpend')}</label>
              <input
                type="number"
                value={form.minOrderDelivery}
                onChange={(e) => updateField('minOrderDelivery', e.target.value)}
                min={0}
                step={0.01}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.storeDeliveryEstimatedTime')}</label>
              <input
                type="number"
                value={form.deliveryLeadTime}
                onChange={(e) => updateField('deliveryLeadTime', e.target.value)}
                min={0}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationForm.storePickupEstimatedTime')}</label>
              <input
                type="number"
                value={form.pickupLeadTime}
                onChange={(e) => updateField('pickupLeadTime', e.target.value)}
                min={0}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </section>

                  </div>
        )}

        {activeTab === 'hours' && (
          <div className="space-y-8 animate-in fade-in duration-300">
        {/* Operating Hours */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t('locationForm.businessHoursSettings')}</h3>
              <p className="text-sm text-gray-500">{t('locationForm.businessHoursSettingsDescription')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const mondayHours = hours.filter(h => h.dayOfWeek === 1);
                if (mondayHours.length === 0) return;
                const newHours: OperatingHour[] = [];
                for (let d = 0; d < 7; d++) {
                  mondayHours.forEach(mh => {
                    newHours.push({ ...mh, dayOfWeek: d });
                  });
                }
                setHours(newHours);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold hover:bg-primary-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {t('locationForm.applyMondayToAllDays')}
            </button>
          </div>

          <div className="space-y-6">
            {DAYS.map((dayName, dayIdx) => {
              const sessions = hours.filter(h => h.dayOfWeek === dayIdx);
              const isClosed = sessions.length === 0 || sessions.every(s => s.isClosed);

              return (
                <div key={dayIdx} className={`group flex flex-col gap-4 p-4 rounded-xl border transition-all ${isClosed ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-primary-200 hover:shadow-sm'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isClosed ? 'bg-gray-300' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
                      <span className="text-sm font-bold text-gray-700">{dayName.split(' ')[0]}</span>
                      {isClosed && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">{t('locationForm.storeClosed')}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHours(prev => [...prev, { dayOfWeek: dayIdx, openTime: '09:00', closeTime: '18:00', isClosed: false }]);
                      }}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('locationForm.addTimeSlot')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sessions.map((session, sIdx) => {
                      const hourIdxInState = hours.findIndex(h => h === session);
                      const isOvernight = !session.isClosed && (session.closeTime < session.openTime);

                      return (
                        <div key={sIdx} className="flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-200">
                          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1">
                            <input
                              type="time"
                              value={session.openTime}
                              onChange={(e) => {
                                const updated = [...hours];
                                updated[hourIdxInState] = { ...session, openTime: e.target.value };
                                setHours(updated);
                              }}
                              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 px-2 py-1 cursor-pointer"
                            />
                            <span className="text-gray-400 text-xs px-1">{t('locationForm.to')}</span>
                            <input
                              type="time"
                              value={session.closeTime}
                              onChange={(e) => {
                                const updated = [...hours];
                                updated[hourIdxInState] = { ...session, closeTime: e.target.value };
                                setHours(updated);
                              }}
                              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 px-2 py-1 cursor-pointer"
                            />
                          </div>

                          {isOvernight && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-100">
                              {t('locationForm.crossMidnight')}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const updated = hours.filter((_, i) => i !== hourIdxInState);
                              setHours(updated);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>

                          {/* Mini Timeline for this session */}
                          <div className="hidden md:flex flex-1 h-1 bg-gray-100 rounded-full overflow-hidden relative min-w-[100px]">
                            {(() => {
                               const [oH, oM] = session.openTime.split(':').map(Number);
                               const [cH, cM] = session.closeTime.split(':').map(Number);
                               const startPct = ((oH * 60 + oM) / 1440) * 100;
                               let durationPct = (((cH * 60 + cM) - (oH * 60 + oM)) / 1440) * 100;
                               if (durationPct <= 0) durationPct += 100;
                               return <div className="absolute h-full bg-primary-400" style={{ left: `${startPct}%`, width: `${durationPct}%` }} />;
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
          </div>
        )}

        {activeTab === 'hr' && (
          <div className="space-y-8 animate-in fade-in duration-300">
        {/* Payroll Configuration */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">💰</span>
            薪資與排班設定 (Payroll & Roster Settings)
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            這些設定會影響系統自動計薪的結果。預設值為符合台灣勞基法的合法標準，您可以依據門市實際運作狀況進行調整。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableOvertimePay"
                checked={form.enableOvertimePay}
                onChange={(e) => setForm({ ...form, enableOvertimePay: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="enableOvertimePay" className="ml-2 block text-sm text-gray-900">
                啟用平日加班費 (超過8小時)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="monthlyNationalHolidayOvertime"
                checked={form.monthlyNationalHolidayOvertime}
                onChange={(e) => setForm({ ...form, monthlyNationalHolidayOvertime: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="monthlyNationalHolidayOvertime" className="ml-2 block text-sm text-gray-900">
                月薪人員國定假日出勤加給
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">平日加班費倍率 (第9~10小時)</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  value={form.overtimeMultiplier1}
                  onChange={(e) => setForm({ ...form, overtimeMultiplier1: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">倍</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">法定預設: 1.34倍</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">平日加班費倍率 (第11~12小時)</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  value={form.overtimeMultiplier2}
                  onChange={(e) => setForm({ ...form, overtimeMultiplier2: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">倍</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">法定預設: 1.67倍</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">休息日出勤倍率</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  value={form.restDayMultiplier}
                  onChange={(e) => setForm({ ...form, restDayMultiplier: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">倍</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">法定預設: 前2小時1.34，後6小時1.67 (此處簡化為統一倍率，建議填1.34)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">例假日出勤倍率</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  value={form.regularDayMultiplier}
                  onChange={(e) => setForm({ ...form, regularDayMultiplier: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">倍</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">法定預設: 2.0倍 (雙倍薪資)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('locationForm.hourlyHolidayMultiplier') || '時薪制國定假日薪資倍率'}</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  value={form.hourlyNationalHolidayMultiplier}
                  onChange={(e) => setForm({ ...form, hourlyNationalHolidayMultiplier: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">倍</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">法定預設: 2.0倍 (雙倍薪資)</p>
            </div>
          </div>
        </section>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-8 animate-in fade-in duration-300">
        {/* Delivery Zones */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('locationForm.deliveryArea')}</h3>
            <button
              type="button"
              onClick={addZone}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {t('locationForm.addDeliveryArea')}
            </button>
          </div>
          {zones.length === 0 && (
            <p className="text-sm text-gray-400">{t('locationForm.noDeliveryAreaConfigured')}</p>
          )}
          <div className="space-y-3">
            {zones.map((zone, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <input
                  type="text"
                  placeholder={t('locationForm.areaName')}
                  value={zone.name}
                  onChange={(e) => {
                    const updated = [...zones];
                    updated[index] = { ...zone, name: e.target.value };
                    setZones(updated);
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">$</span>
                  <input
                    type="number"
                    placeholder={t('locationForm.deliveryFee')}
                    value={zone.charge}
                    onChange={(e) => {
                      const updated = [...zones];
                      updated[index] = { ...zone, charge: parseFloat(e.target.value) || 0 };
                      setZones(updated);
                    }}
                    min={0}
                    step={0.01}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Min $</span>
                  <input
                    type="number"
                    placeholder={t('locationForm.minimumSpend')}
                    value={zone.minOrder}
                    onChange={(e) => {
                      const updated = [...zones];
                      updated[index] = { ...zone, minOrder: parseFloat(e.target.value) || 0 };
                      setZones(updated);
                    }}
                    min={0}
                    step={0.01}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeZone(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
          </div>
        )}

        {/* Danger Zone */}
        {isEdit && user?.role === 'SUPER_ADMIN' && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-950 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('locationForm.dangerZone')}
            </h3>
            <p className="text-sm text-red-800 mb-4 font-semibold">
              {t('locationForm.deleteBranchWarning')}
            </p>
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-200 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('locationForm.deleting')}
                  </>
                ) : (
                  t('locationForm.permanentlyDeleteBranch')
                )}
              </button>
            </div>
          </section>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/locations')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('locationForm.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? t('locationForm.saving') : isEdit ? t('locationForm.updateStoreInfo') : t('locationForm.createStore')}
          </button>
        </div>
      </form>
      </PageContent>
    </div>
  );
}
