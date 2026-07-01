import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Table {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  _count: { reservations: number };
}

interface LocationInfo {
  id: string;
  name: string;
}

export default function TableList() {
  const { t } = useTranslation();
  const { locationId } = useParams();
  const navigate = useNavigate();
  const [tables, setTables] = useState<Table[]>([]);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState(2);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storefrontUrl, setStorefrontUrl] = useState('');

  const fetchTables = () => {
  setLoading(true);
    Promise.all([
      api.get<{ data: LocationInfo }>(`/locations/${locationId}`),
      api.get<{ data: Table[] }>(`/locations/${locationId}/tables`),
      api.get<{ data: any }>('/settings')
    ])
      .then(([locRes, tableRes, settingsRes]) => {
        setLocation(locRes.data);
        setTables(tableRes.data);
        setStorefrontUrl(settingsRes.data.storefrontUrl || import.meta.env.VITE_STORE_URL_PUBLIC || window.location.origin.replace('5173', '5174'));
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    if (locationId) fetchTables();
  }, [locationId]);

  const openCreateForm = () => {
    setEditingTable(null);
    setFormName('');
    setFormCapacity(2);
    setFormActive(true);
    setShowForm(true);
  };

  const openEditForm = (table: Table) => {
    setEditingTable(table);
    setFormName(table.name);
    setFormCapacity(table.capacity);
    setFormActive(table.isActive);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const body = { name: formName, capacity: Number(formCapacity), isActive: formActive };
      if (editingTable) {
        await api.patch(`/locations/${locationId}/tables/${editingTable.id}`, body);
      } else {
        await api.post(`/locations/${locationId}/tables`, body);
      }
      setShowForm(false);
      fetchTables();
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除桌位 "${name}" 嗎？`)) return;
    try {
      await api.delete(`/locations/${locationId}/tables/${id}`);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyTableUrl = (tableName: string) => {
    const baseUrl = storefrontUrl.replace(/\/$/, '');
    const url = `${baseUrl}/?table=${encodeURIComponent(tableName)}`;
    navigator.clipboard.writeText(url)
      .then(() => alert(`已複製桌號 ${tableName} 的專屬網址：\n${url}`))
      .catch(() => alert(t('tableList.copyFailedManualCopy') + url));
  };

  if (loading) return <p className="text-gray-500">{t('tableList.loadingTableData')}</p>;
  if (error) return <p className="text-red-600">{t('tableList.errorLabel')} {error}</p>;

  const activeCount = tables.filter((t) => t.isActive).length;
  const totalCapacity = tables.reduce((sum, t) => sum + (t.isActive ? t.capacity : 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">{t('tableList.tableManagement')}</h2>
          {location && (
            <p className="text-sm text-gray-500 mt-1">{location.name}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/locations/${locationId}`)}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            {t('tableList.returnToBranchInfo')}
          </button>
          <button
            onClick={openCreateForm}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            {t('tableList.addTable')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('tableList.totalTables')}</p>
          <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('tableList.tablesInUse')}</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('tableList.totalCapacity')}</p>
          <p className="text-2xl font-bold text-blue-600">{totalCapacity}</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-primary-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingTable ? t('tableList.editTable') : t('tableList.addNewTable')}
          </h3>
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tableList.tableNameLabel')}</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder={t('tableList.tableNamePlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tableList.maxCapacityLabel')}</label>
              <input
                type="number"
                value={formCapacity}
                onChange={(e) => setFormCapacity(parseInt(e.target.value) || 1)}
                required
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{t('tableList.enable')}</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? t('tableList.saving') : editingTable ? t('tableList.update') : t('tableList.create')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('tableList.cancel')}
            </button>
          </form>
        </div>
      )}

      {/* Table List */}
      {tables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">{t('tableList.noTablesInBranch')}</p>
          <button onClick={openCreateForm} className="text-primary-600 hover:text-primary-700 font-medium">
            {t('tableList.createFirstTable')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tableList.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tableList.maxCapacity')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tableList.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tableList.reservationHistory')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tableList.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.capacity} {t('tableList.seats')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${table.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {table.isActive ? t('tableList.enabled') : t('tableList.disabled')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table._count.reservations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <button onClick={() => copyTableUrl(table.name)} className="text-green-600 hover:text-green-900 font-medium" aria-label={`複製網址 ${table.name}`}>
                      {t('tableList.copyUrl')}
                    </button>
                    <button onClick={() => openEditForm(table)} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={`編輯桌位 ${table.name}`}>
                      {t('tableList.edit')}
                    </button>
                    <button onClick={() => handleDelete(table.id, table.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={`刪除桌位 ${table.name}`}>
                      {t('tableList.delete')}
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
