import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';

export default function SettingsLine() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [status, setStatus] = useState({
    liffId: '',
    officialAccountUrl: '',
    channelAccessToken: '',
    channelSecret: ''
  });

  const [liffId, setLiffId] = useState('');
  const [officialAccountUrl, setOfficialAccountUrl] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  useEffect(() => {
    fetchLocations();
  }, [token]);

  async function fetchLocations() {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/locations');
      if (res.success && Array.isArray(res.data)) {
        setLocations(res.data);
      }
    } catch {}
  }

  useEffect(() => {
    fetchStatus();
  }, [token, selectedLocationId]);

  async function fetchStatus() {
    setLoading(true);
    try {
      const url = selectedLocationId ? `/settings/line?locationId=${selectedLocationId}` : '/settings/line';
      const res = await api.get<{ success: boolean; data: any }>(url);
      if (res.success && res.data) {
        setStatus(res.data);
        setLiffId(res.data.liffId || '');
        setOfficialAccountUrl(res.data.officialAccountUrl || '');
        setChannelAccessToken(res.data.channelAccessToken || '');
        setChannelSecret(res.data.channelSecret || '');
      }
    } catch (err) {
      console.error('Failed to fetch LINE settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const url = selectedLocationId ? `/settings/line?locationId=${selectedLocationId}` : '/settings/line';
      await api.put(url, { 
        liffId, officialAccountUrl, channelAccessToken, channelSecret 
      });
      setSuccess('設定已儲存');
      fetchStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const webhookUrl = `${window.location.origin.replace('admin.', '')}/api/line/webhook`;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LINE 整合設定</h1>
          <p className="text-sm text-gray-500 mt-1">配置您的 LINE 官方帳號 (Messaging API) 與一鍵登入功能 (LINE Login)</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>

      {/* Branch Override Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏬</span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-sans">分店獨立 LINE 設定 (Branch LINE Settings)</h3>
            <p className="text-xs text-gray-500 font-sans">切換分店以進行專屬的 LINE 參數覆寫，未設定之分店將繼承全域 LINE 官方帳號與 LIFF 設定。</p>
          </div>
        </div>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer bg-gray-50 hover:bg-gray-100 font-sans"
        >
          <option value="">🌐 全域系統預設設定 (System Default)</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              📍 {loc.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">{success}</div>}

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">官方帳號連結</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">加入好友網址</label>
              <input
                type="text"
                value={officialAccountUrl}
                onChange={(e) => setOfficialAccountUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="例如 https://line.me/R/ti/p/@yourid"
              />
              <p className="text-xs text-gray-500 mt-2">
                請在 LINE Official Account Manager 取得您的「加入好友」連結。前台將會使用此連結導引顧客。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系統整合金鑰 (Messaging API)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
              <input
                type="password"
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={status.channelSecret ? "已設定 (留白保持不變)" : "請輸入 Channel Secret"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
              <input
                type="password"
                value={channelAccessToken}
                onChange={(e) => setChannelAccessToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={status.channelAccessToken ? "已設定 (留白保持不變)" : "請輸入 Channel Access Token"}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              請至 LINE Developers Console 的 <strong>Messaging API Channel</strong> 取得對應的金鑰，此為後端自動回覆與傳送訊息所需之重要憑證。
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Webhook 設定 (Messaging API)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    alert('已複製到剪貼簿');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  複製
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                請將此 URL 貼回 LINE Developers Console 中 <strong>Messaging API Channel</strong> 的 Webhook URL 欄位，並開啟 「Use webhook」 選項。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">一鍵登入設定 (LINE Login / LIFF)</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LIFF ID (建議填寫)</label>
              <input
                type="text"
                value={liffId}
                onChange={(e) => setLiffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="例如 2000000000-XXXXXXXX"
              />
              <p className="text-xs text-gray-500 mt-2">
                請至 LINE Developers Console 的 <strong>LINE Login Channel</strong> 中建立 LIFF 應用程式以取得 LIFF ID。填寫此 ID 後，前台將會開啟「一鍵自動綁定」與「一鍵登入」功能。
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存所有設定'}
          </button>
        </div>
      </div>
    </div>
  );
}
