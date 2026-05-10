import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

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
}

const DAYS = ['星期日 (Sunday)', '星期一 (Monday)', '星期二 (Tuesday)', '星期三 (Wednesday)', '星期四 (Thursday)', '星期五 (Friday)', '星期六 (Saturday)'];

const defaultHours: OperatingHour[] = DAYS.map((_, i) => ({
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
};

export default function LocationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<LocationData>(emptyLocation);
  const [hours, setHours] = useState<OperatingHour[]>(defaultHours);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEdit ? '編輯門市' : '新增門市'}
        </h2>
        <button
          onClick={() => navigate('/locations')}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          返回門市列表
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本資訊</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { updateField('name', e.target.value); autoSlug(e.target.value); }}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">網址代稱 (Slug) *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                required
                disabled={isEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">描述 (Description)</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">地址資訊</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">詳細地址 *</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">城市 *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">省份/區域</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">郵遞區號 *</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">國家 (Country Code)</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude (經度)</label>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => updateField('lat', parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude (緯度)</label>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => updateField('lng', parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </section>

        {/* Service Settings */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">服務與營運設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">營運中 (Active)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.deliveryEnabled}
                onChange={(e) => updateField('deliveryEnabled', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">提供外送 (Delivery)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.pickupEnabled}
                onChange={(e) => updateField('pickupEnabled', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">提供自取 (Pickup)</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">外送最低消 ($)</label>
              <input
                type="number"
                value={form.minOrderDelivery}
                onChange={(e) => updateField('minOrderDelivery', e.target.value)}
                min={0}
                step={0.01}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">外送預計時間 (分鐘)</label>
              <input
                type="number"
                value={form.deliveryLeadTime}
                onChange={(e) => updateField('deliveryLeadTime', e.target.value)}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">自取預計時間 (分鐘)</label>
              <input
                type="number"
                value={form.pickupLeadTime}
                onChange={(e) => updateField('pickupLeadTime', e.target.value)}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </section>

        {/* Operating Hours */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">營業時間設定</h3>
              <p className="text-sm text-gray-500">設定每週的營業時段，支援跨午夜與多段營業。</p>
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
              以週一為準套用全週
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
                      {isClosed && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">店休</span>}
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
                      新增時段
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
                            <span className="text-gray-400 text-xs px-1">至</span>
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
                              跨午夜 (+1天)
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

        {/* Delivery Zones */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">外送區域</h3>
            <button
              type="button"
              onClick={addZone}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              + 新增區域
            </button>
          </div>
          {zones.length === 0 && (
            <p className="text-sm text-gray-400">尚未設定外送區域。</p>
          )}
          <div className="space-y-3">
            {zones.map((zone, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <input
                  type="text"
                  placeholder="區域名稱"
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
                    placeholder="運費"
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
                    placeholder="最低消費"
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

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/locations')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '儲存中...' : isEdit ? '更新門市資訊' : '建立門市'}
          </button>
        </div>
      </form>
    </div>
  );
}
