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
    isConfigured: false,
    hasSecret: false,
    hasToken: false,
    liffId: '',
    officialAccountUrl: ''
  });

  const [liffId, setLiffId] = useState('');
  const [officialAccountUrl, setOfficialAccountUrl] = useState('');

  useEffect(() => {
    fetchStatus();
  }, [token]);

  async function fetchStatus() {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/line/status');
      if (res.success && res.data) {
        setStatus(res.data);
        setLiffId(res.data.liffId || '');
        setOfficialAccountUrl(res.data.officialAccountUrl || '');
      }
    } catch (err) {
      console.error('Failed to fetch LINE status');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Save LIFF ID and Account URL to database
      await api.put('/settings', { 
        lineSettings: { liffId, officialAccountUrl } 
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
          <p className="text-sm text-gray-500 mt-1">配置您的 LINE 官方帳號與一鍵登入功能</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存設定'}
        </button>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系統環境變數狀態</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${status.hasSecret ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">LINE_CHANNEL_SECRET</span>
                {status.hasSecret ? (
                  <span className="text-xs text-green-600 font-bold px-2 py-1 bg-white rounded border border-green-200">已設定</span>
                ) : (
                  <span className="text-xs text-red-600 font-bold px-2 py-1 bg-white rounded border border-red-200">未設定</span>
                )}
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${status.hasToken ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">LINE_CHANNEL_ACCESS_TOKEN</span>
                {status.hasToken ? (
                  <span className="text-xs text-green-600 font-bold px-2 py-1 bg-white rounded border border-green-200">已設定</span>
                ) : (
                  <span className="text-xs text-red-600 font-bold px-2 py-1 bg-white rounded border border-red-200">未設定</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">
            * 密鑰類型的環境變數需在 Railway 介面設定後重啟服務方可生效。
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Webhook 設定</h2>
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
                請將此 URL 貼回 LINE Developers Console 的 Webhook URL 欄位，並開啟 「Use webhook」 選項。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">進階設定 (LIFF)</h2>
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
                填寫此 ID 後，前台將會開啟「一鍵自動綁定」與「一鍵登入」功能，大幅提升轉換率。
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
