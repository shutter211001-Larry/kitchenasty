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
  const [inventorySyncFrequency, setInventorySyncFrequency] = useState('6h');

  useEffect(() => {
    fetch('/api/settings/advanced', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.maintenanceMode !== undefined) setMaintenanceMode(d.maintenanceMode);
          if (d.maintenanceMessage) setMaintenanceMessage(d.maintenanceMessage);
          if (d.enableRateLimiting !== undefined) setEnableRateLimiting(d.enableRateLimiting);
          if (d.inventorySyncFrequency) setInventorySyncFrequency(d.inventorySyncFrequency);
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
        body: JSON.stringify({
          maintenanceMode,
          maintenanceMessage,
          enableRateLimiting,
          inventorySyncFrequency,
        }),
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

  const steps = ['realtime', '1h', '3h', '6h', '12h', '1d', '1w', '1m'];
  const labels: Record<string, string> = {
    realtime: '即時更新 (Real-time)',
    '1h': '每 1 小時',
    '3h': '每 3 小時',
    '6h': '每 6 小時 (✨ 推薦設定)',
    '12h': '每 12 小時',
    '1d': '每 1 天 (24 小時)',
    '1w': '每 1 週',
    '1m': '每 1 個月',
  };
  const descriptions: Record<string, { desc: string; type: 'warning' | 'info' | 'success' }> = {
    realtime: {
      desc: '⚠️ 即時更新：數據即時性最高。但高峰期會產生高頻率的 API 呼叫與資料庫寫入開銷，適合門市規模小或伺服器規格極高的總部。',
      type: 'warning',
    },
    '1h': {
      desc: '🕒 每小時同步：接近即時，適合對當天門市原物料銷耗非常敏感的品牌，效能開銷較大。',
      type: 'info',
    },
    '3h': {
      desc: '🕒 每 3 小時同步：適合半天結算一次，在數據頻率與效能開銷之間提供中等平衡。',
      type: 'info',
    },
    '6h': {
      desc: '✨ 推薦設定：在「營業數據即時性」與「系統負載與省錢」之間達到最完美的黃金平衡！資料庫讀寫次數暴跌 99% 以上。',
      type: 'success',
    },
    '12h': {
      desc: '🕒 每半天同步：適合每日交班時自動對帳，系統資源佔用極低。',
      type: 'success',
    },
    '1d': {
      desc: '📅 每日對帳：每天打烊後自動結算一次，非常省錢且數據乾淨，能將資料庫連線壓力降到最低。',
      type: 'success',
    },
    '1w': {
      desc: '📅 每週結算：適合按週向加盟商請款與配送原物料的連鎖品牌，幾乎不耗費任何伺服器資源。',
      type: 'success',
    },
    '1m': {
      desc: '📅 每月對帳：極致省錢。僅在月底結算請款時一次性處理，對外 API 與資料庫開銷近乎為零。',
      type: 'success',
    },
  };

  const currentIndex = steps.indexOf(inventorySyncFrequency);
  const safeIndex = currentIndex !== -1 ? currentIndex : 3; // default to 6h

  const currentDesc = descriptions[steps[safeIndex]] || { desc: '', type: 'info' };

  return (
    <div className="max-w-4xl mx-auto px-4 py-2">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium flex items-center gap-1">
            <span>&larr;</span> 返回系統設定
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">⚙️ 系統進階與效能設定</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm shadow-sm flex items-center gap-2">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg text-sm shadow-sm flex items-center gap-2">
          <span>✅</span>
          <div>{success}</div>
        </div>
      )}

      <div className="space-y-6">
        
        {/* Section 1: Maintenance Mode */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🚧 維護模式設定
          </h2>
          
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-700">啟用維護模式</span>
            </label>
            {maintenanceMode && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ 警告：啟用維護模式後，顧客端點餐網站將暫時阻擋，僅顯示下方的維護公告訊息。
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">維護公告訊息</label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="網站維護中，請稍候再試。"
            />
          </div>
        </div>

        {/* Google Integrations Redirect Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="flex items-start gap-4">
            <div className="text-3xl">🌐</div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Google 整合服務 (Gemini AI, SSO)</h2>
              <p className="text-sm text-gray-500 mb-3">
                Gemini AI 金鑰、第三方登入 (Google SSO) 以及其他 Google 服務已移至專屬設定頁面。
              </p>
              <a href="/settings/google" className="inline-block px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                前往 Google 整合設定
              </a>
            </div>
          </div>
        </div>

        {/* Section 2: Performance Sync Frequency (The Gorgeous Slider!) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                📈 總部食譜配方與庫存對帳同步設定 (Sync Frequency)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                設定點單系統（加盟店端）的銷貨日誌，每隔多久同步扣減總部配方管理系統（ShutterERP）的原料庫存。
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold text-xs rounded-full shadow-sm">
              省電保護中
            </span>
          </div>

          {/* Interactive Range Slider UI */}
          <div className="py-6 px-2 space-y-6">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="7"
                value={safeIndex}
                onChange={(e) => setInventorySyncFrequency(steps[parseInt(e.target.value) || 0])}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
              />
              
              {/* Range Scale Tick Labels */}
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold px-1 mt-2 select-none">
                <span>即時更新</span>
                <span>1小時</span>
                <span>3小時</span>
                <span className="text-emerald-600 font-bold">6小時</span>
                <span>12小時</span>
                <span>1天</span>
                <span>1週</span>
                <span>1個月</span>
              </div>
            </div>

            {/* Dynamic Frequency Detail Widget */}
            <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold block uppercase">當前同步排程</span>
                <span className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                  🔄 {labels[steps[safeIndex]]}
                </span>
              </div>
              
              {/* Mini performance meter badge */}
              <div className="flex items-center gap-2 bg-white px-3 py-2 border border-gray-150 rounded-xl shadow-xs self-start md:self-auto">
                <span className="text-[10px] text-gray-400 font-bold">系統負載：</span>
                <span className={`text-xs font-bold ${
                  steps[safeIndex] === 'realtime' ? 'text-red-600' :
                  ['1h', '3h'].includes(steps[safeIndex]) ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {steps[safeIndex] === 'realtime' ? '🔴 高負載' :
                   ['1h', '3h'].includes(steps[safeIndex]) ? '🟡 中負載' : '🟢 極低負載'}
                </span>
              </div>
            </div>

            {/* Dynamic Dynamic cost efficiency and database load description box */}
            <div className={`p-4 rounded-xl text-xs leading-relaxed border font-medium transition-all duration-300 ${
              currentDesc.type === 'warning' ? 'bg-red-50 text-red-800 border-red-200' :
              currentDesc.type === 'info' ? 'bg-blue-50 text-blue-800 border-blue-200' :
              'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {currentDesc.desc}
            </div>
          </div>
        </div>

        {/* Section 3: Rate Limiting */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🛡️ 安全性防禦設定
          </h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableRateLimiting}
              onChange={(e) => setEnableRateLimiting(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
            />
            <span className="text-sm font-semibold text-gray-700">啟用 API 請求速率限制 (Rate Limiting)</span>
          </label>
          <p className="text-xs text-gray-400">
            開啟此功能後，系統會自動防止同一 IP 在極短時間內發送大量惡意點單請求，加固系統免受簡易的 CC 攻擊。
          </p>
        </div>

        {/* Section 4: IP Blacklist Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🚫 惡意 IP 黑名單管理
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">在此手動封鎖惡意嘗試登入或破壞的 IP 地址，封鎖後將無法訪問任何服務。</p>
          </div>
          
          <IPBlacklistManager token={token} />
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          {saving ? '儲存中...' : '儲存所有系統設定'}
        </button>
      </div>
    </div>
  );
}
