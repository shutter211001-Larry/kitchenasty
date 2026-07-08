import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageContent } from '../components/layout/PageContent';
import { api } from '../lib/api.js';

export default function SettingsPermissions() {
  const { t } = useTranslation();
    const PERMISSION_KEYS = [
      { key: 'UPDATE_GENERAL_SETTINGS', label: t('settingsPermissions.editGeneralSettings'), desc: t('settingsPermissions.editGeneralSettingsDescription') },
      { key: 'UPDATE_ORDER_SETTINGS', label: t('settingsPermissions.editOrderSettings'), desc: t('settingsPermissions.editOrderSettingsDescription') },
      { key: 'EXPORT_DATA', label: t('settingsPermissions.exportData'), desc: t('settingsPermissions.exportDataDescription') },
      { key: 'MANAGE_ORDERS', label: t('settingsPermissions.orderProcessing'), desc: t('settingsPermissions.orderProcessingDescription') },
      { key: 'CANCEL_ORDERS', label: t('settingsPermissions.cancelOrder'), desc: t('settingsPermissions.cancelOrderDescription') },
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
    api.get('settings/general')
      
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
      const res = await api.put('settings/general', JSON.stringify({ permissions }));
      const data = res;
      if (data.success) {
        setSuccess(t('settingsPermissions.permissionsUpdated'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || t('settingsPermissions.saveFailed'));
      }
    } catch {
      setError(t('settingsPermissions.networkError'));
    } finally {
      setSaving(false);
    }
  }

  const togglePermission = (role: string, key: string) => {
  setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role]?.[key]
      }
    }));
  };

  if (loading) return <div className="p-6 text-gray-500">{t('settingsPermissions.loading')}</div>;

  
      
  const actionButton = (
    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
      {saving ? t('settingsPermissions.saving') : t('settingsPermissions.saveChanges')}
    </button>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('settingsPermissions.rolePermissionFineTuning')}
        backUrl="/settings"
        backText={t('settingsPermissions.backToSettings')}
        action={actionButton}
      />
      <PageContent>


      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manager Column */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              {t('settingsPermissions.roleManager')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{t('settingsPermissions.manageDailyOperations')}</p>
          </div>
          <div className="p-4 space-y-4">
            {PERMISSION_KEYS.map(p => (
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" key={`manager-${p.key}`}>
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {t('settingsPermissions.roleStaff')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{t('settingsPermissions.staffResponsibilities')}</p>
          </div>
          <div className="p-4 space-y-4">
            {PERMISSION_KEYS.map(p => (
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" key={`staff-${p.key}`}>
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
          {saving ? t('settingsPermissions.saving') : t('settingsPermissions.saveAllPermissionSettings')}
        </button>
        </div>
      </PageContent>
    </div>
  );
}
