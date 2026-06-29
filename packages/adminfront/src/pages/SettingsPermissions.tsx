import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PERMISSION_KEYS = [
  { key: 'UPDATE_GENERAL_SETTINGS', label: '修改一般設定', desc: '可更改網站名稱、設計風格等' },
  { key: 'UPDATE_ORDER_SETTINGS', label: '修改訂單設定', desc: '可更改運費、稅率、自動訊息等' },
  { key: 'EXPORT_DATA', label: '匯出資料', desc: '可下載訂單 CSV 報表' },
  { key: 'MANAGE_ORDERS', label: '訂單處理', desc: '可更改訂單狀態（接單、出餐等）' },
  { key: 'CANCEL_ORDERS', label: '取消訂單', desc: '可手動取消顧客的訂單' },
];

export default function SettingsPermissions() {
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
        setSuccess('權限設定已更新');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || '儲存失敗');
      }
    } catch {
      setError('網路錯誤');
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

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; 返回設定</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">角色權限微調</h1>
          <p className="text-sm text-gray-500">超級管理員 (SUPER_ADMIN) 擁有所有權限，不可修改。</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? '儲存中...' : '儲存變更'}
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
              店長 (MANAGER)
            </h2>
            <p className="text-xs text-gray-500 mt-1">管理店內日常營運與部分設定</p>
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
              店員 (STAFF)
            </h2>
            <p className="text-xs text-gray-500 mt-1">主要負責訂單處理與外場操作</p>
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
          {saving ? '儲存中...' : '儲存所有權限設定'}
        </button>
      </div>
    </div>
  );
}
