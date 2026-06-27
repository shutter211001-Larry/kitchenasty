import { useState, useEffect, useRef } from 'react';
import { getFullUrl } from '../utils/url.js';

export default function DesignBranding() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [siteName, setSiteName] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSiteName(res.data.siteName);
          setSiteTitle(res.data.siteTitle);
          setSiteDescription(res.data.siteDescription || '');
          setLogo(getFullUrl(res.data.logo));
          setFavicon(getFullUrl(res.data.favicon));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ siteName, siteTitle, siteDescription }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('品牌設定已更新');
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

  async function handleFileUpload(type: 'logo' | 'favicon', file: File) {
    const formData = new FormData();
    formData.append(type, file);

    try {
      const res = await fetch(`/api/settings/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (type === 'logo') setLogo(getFullUrl(data.data.logo));
        else setFavicon(getFullUrl(data.data.favicon));
        setSuccess(`${type === 'logo' ? '標誌 (Logo)' : '網站圖示 (Favicon)'} 已成功上傳`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : '上傳失敗');
      }
    } catch {
      setError('上傳失敗');
    }
  }

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">品牌設定 (Branding)</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">網站名稱 (Site Name)</label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="雲端點餐系統"
          />
          <p className="mt-1 text-xs text-gray-500">顯示於頁首、頁尾以及瀏覽器分頁。</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">網站標題 (Site Title)</label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="雲端點餐系統 - 線上訂餐"
          />
          <p className="mt-1 text-xs text-gray-500">顯示於瀏覽器分頁標題。</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">網站描述 (Site Description)</label>
          <textarea
            value={siteDescription}
            onChange={(e) => setSiteDescription(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="專門提供美味手工披薩與線上點餐服務"
            rows={3}
          />
          <p className="mt-1 text-xs text-gray-500">顯示於 Google 搜尋結果與 LINE 分享時的網址描述 (SEO / OpenGraph)。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">標誌 (Logo)</h2>
          {logo ? (
            <div className="mb-4">
              <img src={logo} alt="Logo" className="w-24 h-24 object-contain rounded-lg border border-gray-200" />
            </div>
          ) : (
            <div className="mb-4 w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              尚未設定標誌
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload('logo', file);
            }}
          />
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            上傳標誌
          </button>
        </div>

        {/* Favicon */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">網站圖示 (Favicon)</h2>
          {favicon ? (
            <div className="mb-4">
              <img src={favicon} alt="Favicon" className="w-16 h-16 object-contain rounded-lg border border-gray-200" />
            </div>
          ) : (
            <div className="mb-4 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
              尚未設定圖示
            </div>
          )}
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload('favicon', file);
            }}
          />
          <button
            type="button"
            onClick={() => faviconInputRef.current?.click()}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            上傳圖示
          </button>
        </div>
      </div>
    </div>
  );
}
