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
      .catch(() => alert('複製失敗，請手動複製網址：\n' + url));
  };

  if (loading) return <p className="text-gray-500">載入桌位資料中...</p>;
  if (error) return <p className="text-red-600">錯誤: {error}</p>;

  const activeCount = tables.filter((t) => t.isActive).length;
  const totalCapacity = tables.reduce((sum, t) => sum + (t.isActive ? t.capacity : 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">桌位管理 (Tables)</h2>
          {location && (
            <p className="text-sm text-gray-500 mt-1">{location.name}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/locations/${locationId}`)}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            返回分店資料
          </button>
          <button
            onClick={openCreateForm}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            + 新增桌位
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">總桌數</p>
          <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">使用中桌數</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">總容納人數</p>
          <p className="text-2xl font-bold text-blue-600">{totalCapacity}</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-primary-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingTable ? '編輯桌位' : '新增桌位'}
          </h3>
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">名稱 (如：1號桌) *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="例如：1號桌、露台 A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">人數上限 *</label>
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
              <span className="text-sm text-gray-700">啟用</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? '儲存中...' : editingTable ? '更新' : '建立'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
          </form>
        </div>
      )}

      {/* Table List */}
      {tables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">此分店目前尚無桌位。</p>
          <button onClick={openCreateForm} className="text-primary-600 hover:text-primary-700 font-medium">
            建立您的第一個桌位
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名稱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">人數上限</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">預約紀錄</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.capacity} 人座
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${table.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {table.isActive ? '啟用中' : '已停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table._count.reservations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <button onClick={() => copyTableUrl(table.name)} className="text-green-600 hover:text-green-900 font-medium" aria-label={`複製網址 ${table.name}`}>
                      複製網址
                    </button>
                    <button onClick={() => openEditForm(table)} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={`編輯桌位 ${table.name}`}>
                      編輯
                    </button>
                    <button onClick={() => handleDelete(table.id, table.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={`刪除桌位 ${table.name}`}>
                      刪除
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
