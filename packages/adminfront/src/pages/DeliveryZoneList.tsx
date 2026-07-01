import { useTranslation } from 'react-i18next';
import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

interface DeliveryZone {
  id: string;
  name: string;
  charge: number;
  minOrder: number;
  boundaries: unknown;
  isActive: boolean;
}

export default function DeliveryZoneList() {
  const { t } = useTranslation();

  const { locationId } = useParams<{ locationId: string }>();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New zone form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [charge, setCharge] = useState('0');
  const [minOrder, setMinOrder] = useState('0');
  const [boundariesJson, setBoundariesJson] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    api.get<{ data: DeliveryZone[] }>(`/locations/${locationId}/delivery-zones`)
      .then((res) => setZones(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let boundaries = null;
      if (boundariesJson.trim()) {
        try {
          boundaries = JSON.parse(boundariesJson);
        } catch {
          setError(t('deliveryZoneList.boundaryDataFormatError'));
          setSaving(false);
          return;
        }
      }

      const res = await api.post<{ data: DeliveryZone }>(`/locations/${locationId}/delivery-zones`, {
        name,
        charge: parseFloat(charge) || 0,
        minOrder: parseFloat(minOrder) || 0,
        boundaries,
      });

      setZones((prev) => [...prev, res.data]);
      setShowForm(false);
      setName('');
      setCharge('0');
      setMinOrder('0');
      setBoundariesJson('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    try {
      await api.patch(`/locations/${locationId}/delivery-zones/${zone.id}`, {
        isActive: !zone.isActive,
      });
      setZones((prev) =>
        prev.map((z) => z.id === zone.id ? { ...z, isActive: !z.isActive } : z)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteZone = async (id: string) => {
    if (!confirm(t('deliveryZoneList.confirmDeleteDeliveryZone'))) return;
    try {
      await api.delete(`/locations/${locationId}/delivery-zones/${id}`);
      setZones((prev) => prev.filter((z) => z.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('deliveryZoneList.deliveryZoneManagement')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showForm ? t('deliveryZoneList.cancel') : t('deliveryZoneList.addNewZone')}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliveryZoneList.zoneNameWithLabel')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                placeholder={t('deliveryZoneList.exampleDowntown')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliveryZoneList.deliveryFeeWithSymbol')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={charge}
                onChange={(e) => setCharge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliveryZoneList.minimumOrderAmountWithSymbol')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliveryZoneList.boundarySettings')}</label>
            <textarea
              value={boundariesJson}
              onChange={(e) => setBoundariesJson(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none font-mono"
              placeholder={t('deliveryZoneList.coordinatesFormat')}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? t('deliveryZoneList.savingInProgress') : t('deliveryZoneList.createZone')}
          </button>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label={t('deliveryZoneList.loading')} />
        </div>
      )}

      {!loading && zones.length === 0 && !showForm && (
        <p className="text-gray-500 text-center py-12">{t('deliveryZoneList.noDeliveryZonesSet')}</p>
      )}

      {!loading && zones.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('deliveryZoneList.zoneName')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('deliveryZoneList.deliveryFee')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('deliveryZoneList.minimumOrderAmount')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('deliveryZoneList.status')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('deliveryZoneList.action')}</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{zone.name}</td>
                  <td className="px-4 py-3 text-right">${zone.charge.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">${zone.minOrder.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(zone)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${zone.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                         }`}
                      aria-label={`${zone.isActive ? t('deliveryZoneList.disable') : t('deliveryZoneList.enable')} 區域 ${zone.name}`}
                    >
                      {zone.isActive ? t('deliveryZoneList.enabled') : t('deliveryZoneList.disabled')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                      aria-label={`刪除區域 ${zone.name}`}
                    >
                      {t('deliveryZoneList.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
