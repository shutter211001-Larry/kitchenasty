import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function IPBlacklistManager({ token }: { token: string }) {
  const [list, setList] = useState<{ ip: string; reason: string | null; createdAt: string }[]>([]);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchList = () => {
    fetch('/api/settings/ip-blacklist', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (res.success) setList(res.data); });
  };

  useEffect(() => { fetchList(); }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/settings/ip-blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ip: newIp, reason: newReason })
    });
    setNewIp('');
    setNewReason('');
    fetchList();
    setLoading(false);
  };

  const handleRemove = async (ip: string) => {
    if (!confirm(`確定要解除封鎖 ${ip} 嗎？`)) return;
    await fetch(`/api/settings/ip-blacklist/${ip}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchList();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          required
          type="text"
          placeholder="IP 地址 (例如: 1.2.3.4)"
          value={newIp}
          onChange={e => setNewIp(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <input
          type="text"
          placeholder="原因 (選填)"
          value={newReason}
          onChange={e => setNewReason(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50"
        >
          封鎖 IP
        </button>
      </form>

      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 font-medium">IP 地址</th>
              <th className="px-4 py-2 font-medium">原因</th>
              <th className="px-4 py-2 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {list.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">目前沒有黑名單 IP</td></tr>
            ) : (
              list.map(item => (
                <tr key={item.ip}>
                  <td className="px-4 py-2 font-mono text-xs">{item.ip}</td>
                  <td className="px-4 py-2 text-gray-500">{item.reason || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleRemove(item.ip)} className="text-red-600 hover:text-red-700 text-xs font-bold">解除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsAdvanced() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [enableRateLimiting, setEnableRateLimiting] = useState(false);

  useEffect(() => {
    fetch('/api/settings/advanced', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.maintenanceMode !== undefined) setMaintenanceMode(d.maintenanceMode);
          if (d.maintenanceMessage) setMaintenanceMessage(d.maintenanceMessage);
          if (d.enableRateLimiting !== undefined) setEnableRateLimiting(d.enableRateLimiting);
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
      const res = await fetch('/api/settings/advanced', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ maintenanceMode, maintenanceMessage, enableRateLimiting }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('進階設定已更新');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : '儲存失敗');
      }
    } catch {
      setError('網路連線錯誤');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; 返回設定</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">進階設定</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">啟用維護模式</span>
          </label>
          {maintenanceMode && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium font-bold">警告：啟用維護模式後，顧客將暫時無法進入點餐網站。</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">維護公告訊息</label>
          <textarea
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="網站維護中，請稍候再試。"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={enableRateLimiting} onChange={(e) => setEnableRateLimiting(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
          <span className="text-sm font-medium text-gray-700">啟用請求速率限制 (Rate Limiting)</span>
        </label>
      </div>

      {/* IP Blacklist Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 mt-6">
        <h2 className="text-lg font-bold text-gray-900">IP 黑名單管理</h2>
        <p className="text-sm text-gray-500">在此手動封鎖惡意攻擊的 IP 地址。</p>
        
        <IPBlacklistManager token={token} />
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存所有變更'}
        </button>
      </div>
    </div>
  );
}
