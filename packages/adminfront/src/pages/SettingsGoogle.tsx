import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function SettingsGoogle() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gemini AI
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Google SSO
  const [googleLoginClientId, setGoogleLoginClientId] = useState('');
  const [googleLoginClientSecret, setGoogleLoginClientSecret] = useState('');

  // Gmail API
  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');
  const [gmailRefreshToken, setGmailRefreshToken] = useState('');

  // Google Maps
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');

  useEffect(() => {
    fetch('/api/settings/google', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.geminiApiKey) setGeminiApiKey(d.geminiApiKey);
          if (d.googleLoginClientId) setGoogleLoginClientId(d.googleLoginClientId);
          if (d.googleLoginClientSecret) setGoogleLoginClientSecret(d.googleLoginClientSecret);
          if (d.gmailClientId) setGmailClientId(d.gmailClientId);
          if (d.gmailClientSecret) setGmailClientSecret(d.gmailClientSecret);
          if (d.gmailRefreshToken) setGmailRefreshToken(d.gmailRefreshToken);
          if (d.googleMapsApiKey) setGoogleMapsApiKey(d.googleMapsApiKey);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/google', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          geminiApiKey,
          googleLoginClientId,
          googleLoginClientSecret,
          gmailClientId,
          gmailClientSecret,
          gmailRefreshToken,
          googleMapsApiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.geminiApiKey) setGeminiApiKey(data.data.geminiApiKey);
        if (data.data?.googleLoginClientSecret) setGoogleLoginClientSecret(data.data.googleLoginClientSecret);
        if (data.data?.gmailClientSecret) setGmailClientSecret(data.data.gmailClientSecret);
        if (data.data?.gmailRefreshToken) setGmailRefreshToken(data.data.gmailRefreshToken);
        if (data.data?.googleMapsApiKey) setGoogleMapsApiKey(data.data.googleMapsApiKey);
        toast.success('Google 設定已儲存');
      } else {
        toast.error(typeof data.error === 'string' ? data.error : '儲存失敗');
      }
    } catch {
      toast.error('網路連線錯誤');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Google 整合設定</h1>
          <p className="text-sm text-gray-500 mt-1">
            在此設定您的 Google 相關服務，包含 AI、登入、郵件與地圖。
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      <div className="grid gap-6">
        {/* Gemini AI Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            ✨ Gemini AI 整合 (Gemini 1.5 Flash / Pro)
          </h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gemini API Key</label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="已設定 (留白保持不變)"
            />
            <p className="text-xs text-gray-500 mt-2">
              取得金鑰請至 Google AI Studio。用於多語系自動翻譯與智能推薦。
            </p>
          </div>
        </div>

        {/* Google SSO Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🔑 第三方登入整合 (Google SSO)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
              <input
                type="text"
                value={googleLoginClientId}
                onChange={(e) => setGoogleLoginClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="例如 12345-abcde.apps.googleusercontent.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
              <input
                type="password"
                value={googleLoginClientSecret}
                onChange={(e) => setGoogleLoginClientSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="已設定 (留白保持不變)"
              />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
            💡 設定完成後請重啟 API Server 以使 Passport 驗證策略生效。
          </p>
        </div>

        {/* Gmail API Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            ✉️ Gmail API 整合
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            要使用 Gmail API 寄信，請在「郵件設定」選擇「GMAIL_API」，並在此處設定憑證。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
              <input
                type="text"
                value={gmailClientId}
                onChange={(e) => setGmailClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
              <input
                type="password"
                value={gmailClientSecret}
                onChange={(e) => setGmailClientSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="已設定 (留白保持不變)"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Refresh Token</label>
              <input
                type="password"
                value={gmailRefreshToken}
                onChange={(e) => setGmailRefreshToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="已設定 (留白保持不變)"
              />
            </div>
          </div>
        </div>

        {/* Google Maps Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🗺️ Google Maps 整合
          </h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Google Maps API Key</label>
            <input
              type="password"
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="已設定 (留白保持不變)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
