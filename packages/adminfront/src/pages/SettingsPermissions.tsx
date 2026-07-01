import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsPermissions() {
    const PERMISSION_KEYS = [
      { key: 'UPDATE_GENERAL_SETTINGS', label: t('autoGen.admin.key1492'), desc: t('autoGen.admin.key1493') },
      { key: 'UPDATE_ORDER_SETTINGS', label: t('autoGen.admin.key1494'), desc: t('autoGen.admin.key1495') },
      { key: 'EXPORT_DATA', label: t('autoGen.admin.key1496'), desc: t('autoGen.admin.key1497') },
      { key: 'MANAGE_ORDERS', label: t('autoGen.admin.key1498'), desc: t('autoGen.admin.key1499') },
      { key: 'CANCEL_ORDERS', label: t('autoGen.admin.key1500'), desc: t('autoGen.admin.key1501') },
    ];

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    MANAGER: {},
    STAFF: {}
  });

  useEffect(() => {
    fetch('/api/settings/general', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          if (res.data.permissions) {
            setPermissions(res.data.permissions);
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
    try {
      const res = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('autoGen.admin.key1502'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || t('autoGen.admin.key1503'));
      }
    } catch {
      setError(t('autoGen.admin.key1504'));
    } finally {
      setSaving(false);
    }
  }

  const togglePermission = (role: string, key: string) => {
  const { t } = useTranslation();

    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role]?.[key]
      }
    }));
  };

  if (loading) return <div className="p-6 text-gray-500">{t('autoGen.admin.key1505')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">{t('autoGen.admin.key1506')}</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('autoGen.admin.key1507')}</h1>
          <p className="text-sm text-gray-500">{t('autoGen.admin.key1508')}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? t('autoGen.admin.key1509') : t('autoGen.admin.key1510')}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manager Column */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              {t('autoGen.admin.key1511')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{t('autoGen.admin.key1512')}</p>
          </div>
          <div className="p-4 space-y-4">
            {PERMISSION_KEYS.map(p => (
              <label key={`manager-${p.key}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                <input 
                  type="checkbox" 
                  checked={permissions.MANAGER?.[p.key] ?? true} // Default true for Manager
                  onChange={() => togglePermission('MANAGER', p.key)}
                  className="w-4 h-4 mt-1 text-primary-600 rounded"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Staff Column */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {t('autoGen.admin.key1513')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{t('autoGen.admin.key1514')}</p>
          </div>
          <div className="p-4 space-y-4">
            {PERMISSION_KEYS.map(p => (
              <label key={`staff-${p.key}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                <input 
                  type="checkbox" 
                  checked={permissions.STAFF?.[p.key] ?? false} // Default false for Staff
                  onChange={() => togglePermission('STAFF', p.key)}
                  className="w-4 h-4 mt-1 text-primary-600 rounded"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
        >
          {saving ? t('autoGen.admin.key1515') : t('autoGen.admin.key1516')}
        </button>
      </div>
    </div>
  );
}
