import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { OpenLocationCode } from 'open-location-code';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { confirm } from "../lib/confirm";
import LocationInventoryPanel from '../components/inventory/LocationInventoryPanel.js';

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
  isFranchise?: boolean;
  franchiseeName?: string;
  royaltyRate?: number;
  hourlyNationalHolidayMultiplier: number;
  monthlyNationalHolidayOvertime: boolean;
  enableOvertimePay: boolean;
  overtimeMultiplier1: number;
  overtimeMultiplier2: number;
  restDayMultiplier: number;
  regularDayMultiplier: number;
  isMainStore: boolean;
  parentLocationId?: string | null;
  syncSettingsWithMain: boolean;
  syncOrdersWithMain: boolean;
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
  isFranchise: false,
  franchiseeName: '',
  royaltyRate: 5.0,
  hourlyNationalHolidayMultiplier: 2.0,
  monthlyNationalHolidayOvertime: true,
  enableOvertimePay: true,
  overtimeMultiplier1: 1.34,
  overtimeMultiplier2: 1.67,
  restDayMultiplier: 1.34,
  regularDayMultiplier: 2.0,
  isMainStore: false,
  parentLocationId: null,
  syncSettingsWithMain: true,
  syncOrdersWithMain: false,
};

export default function LocationForm({ isTabMode = false }: { isTabMode?: boolean }) {
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
  const [activeTab, setActiveTab] = useState<'basic' | 'hours' | 'hr' | 'delivery' | 'inventory' | 'menu' | 'integrations'>('basic');
  const [mainStores, setMainStores] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    api.get<{data: any[]}>('/locations').then(res => {
      setMainStores(res.data.filter(l => l.isMainStore && l.id !== id));
    }).catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    if (!await confirm(t('locationForm.confirmDeleteStore'))) {
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
          isMainStore: loc.isMainStore ?? false,
          parentLocationId: loc.parentLocationId ?? null,
          syncSettingsWithMain: loc.syncSettingsWithMain ?? true,
          syncOrdersWithMain: loc.syncOrdersWithMain ?? false,
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
        operatingHours: isTabMode ? undefined : hours,
      };

      if (isEdit) {
        const { slug: _, ...updateBody } = body;
        await api.patch(`/locations/${id}`, updateBody);
        if (isTabMode) {
          toast.success(t('common.savedSuccessfully', '儲存成功'));
        } else {
          navigate('/locations');
        }
      } else {
        const res = await api.post<{ data: { id: string } }>('/locations', body);
        toast.success('門市建立成功');
        navigate(`/locations/${res.data.id}/basic`);
      }
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

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-md">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 mb-0">{t('locationForm.basicInformation')}</h3>
          {isTabMode && (
            <button type="submit" disabled={saving} className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
              {saving ? t('locationForm.saving') : t('locationForm.save')}
            </button>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('locationForm.nameRequired')}</label>
              <input type="text" value={form.name} onChange={(e) => { updateField('name', e.target.value); autoSlug(e.target.value); }} required className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('locationForm.slugRequired')}</label>
              <input type="text" value={form.slug} onChange={(e) => updateField('slug', e.target.value)} required disabled={isEdit} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
          </div>
        </div>
      </div>

      {!isTabMode && (
        <>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('locationForm.businessHoursSettings')}</h3>
          </div>
          <div className="flex justify-end mt-8">
            <button type="button" onClick={() => navigate('/locations')} className="mr-4 px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">{t('locationForm.cancel')}</button>
            <button type="submit" disabled={saving} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">{saving ? t('locationForm.saving') : t('locationForm.save')}</button>
          </div>
        </>
      )}
    </form>
  );

  if (isTabMode) return formContent;

  return (
    <div className="pb-12">
      <PageHeader
        title={isEdit ? t('locationForm.editStore') : t('locationForm.addStore')}
        backUrl="/locations"
        actions={isEdit ? <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">{deleting ? t('locationForm.deleting') : t('locationForm.deleteStore')}</button> : undefined}
      />
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
        {activeTab === 'menu' && isEdit && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('locationForm.b81019') || (t('locationForm.b81019') || '店家菜單管理')}</h3>
            <p className="text-gray-500 text-sm mb-6">
              {t('locationForm.3b34e5') || (t('locationForm.3b34e5') || '管理此店家的專屬菜單與分類。進入菜單管理後，系統會自動過濾並僅顯示此店家的菜品。若開啟跟隨主店家，您可以外加上架自己的專屬菜品。')}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate(`/menu/categories?locationId=${id}`)}
                className="btn-secondary"
              >
                {t('locationForm.cb3fbd') || (t('locationForm.cb3fbd') || '管理菜單分類')}</button>
              <button 
                onClick={() => navigate(`/menu/items?locationId=${id}`)}
                className="btn-primary"
              >
                {t('locationForm.808dcb') || (t('locationForm.808dcb') || '管理菜單品項')}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && isEdit && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('locationForm.aeca94') || (t('locationForm.aeca94') || '店家整合設定')}</h3>
            {form.syncSettingsWithMain && form.parentLocationId ? (
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-gray-900 font-medium">{t('locationForm.b90896') || (t('locationForm.b90896') || '此分店目前跟隨主店家設定')}</h4>
                <p className="text-gray-500 text-sm mt-1">{t('locationForm.10eadc') || (t('locationForm.10eadc') || '如需自訂此分店專屬的整合金鑰與設定，請先在「基本設定」中取消「跟隨主店家設定」。')}</p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-sm mb-6">
                  {t('locationForm.3fe459') || (t('locationForm.3fe459') || '設定此店家的專屬 LINE 官方帳號、支付串接、Google 登入與信件通知等獨立憑證。')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => navigate(`/settings/line?locationId=${id}`)} className="p-4 border border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
                    <h4 className="font-medium text-gray-900">{t('locationForm.5b8a19') || (t('locationForm.5b8a19') || 'LINE 整合設定')}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t('locationForm.fcbf1b') || (t('locationForm.fcbf1b') || '設定獨立的 LINE OA、LINE Login 與 LINE Pay。')}</p>
                  </button>
                  <button onClick={() => navigate(`/settings/payments?locationId=${id}`)} className="p-4 border border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
                    <h4 className="font-medium text-gray-900">{t('locationForm.ff081c') || (t('locationForm.ff081c') || '支付串接設定')}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t('locationForm.938035') || (t('locationForm.938035') || '設定獨立的 Stripe 或綠界科技金鑰。')}</p>
                  </button>
                  <button onClick={() => navigate(`/settings/google?locationId=${id}`)} className="p-4 border border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
                    <h4 className="font-medium text-gray-900">{t('locationForm.2acbc6') || (t('locationForm.2acbc6') || 'Google 整合設定')}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t('locationForm.474279') || (t('locationForm.474279') || '設定獨立的 Google SSO 與 Google Maps API。')}</p>
                  </button>
                  <button onClick={() => navigate(`/settings/mail?locationId=${id}`)} className="p-4 border border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
                    <h4 className="font-medium text-gray-900">{t('locationForm.244d85') || (t('locationForm.244d85') || '信件通知設定')}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t('locationForm.375bfd') || (t('locationForm.375bfd') || '設定獨立的 SMTP 信件伺服器。')}</p>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageContent>
    </div>
  );
}
