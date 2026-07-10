import { api } from '../lib/api';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SettingsMail() {
  const { t } = useTranslation();
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Gmail API Keys (From googleSettings)
  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');
  const [gmailRefreshToken, setGmailRefreshToken] = useState('');

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  // Welcome Email Template
  const [welcomeSubject, setWelcomeSubject] = useState('');
  const [welcomeBody, setWelcomeBody] = useState('');

  // Test Email
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/settings/mail'),
      api.get<any>('/settings/google')
    ])
    .then(([mailRes, googleRes]) => {
      if (mailRes.success && mailRes.data) {
        setSenderName(mailRes.data.senderName || '');
        setSenderEmail(mailRes.data.senderEmail || '');
        if (mailRes.data.welcomeEmailTemplate) {
          setWelcomeSubject(mailRes.data.welcomeEmailTemplate.subject || '');
          setWelcomeBody(mailRes.data.welcomeEmailTemplate.body || '');
        }
      }
      if (googleRes.success && googleRes.data) {
        setGmailClientId(googleRes.data.gmailClientId || '');
        setGmailClientSecret(googleRes.data.gmailClientSecret || '');
        setGmailRefreshToken(googleRes.data.gmailRefreshToken || '');
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
      const mailPayload = {
        senderName,
        senderEmail,
        mailServiceType: 'GMAIL_API',
        welcomeEmailTemplate: {
          subject: welcomeSubject,
          body: welcomeBody
        }
      };
      
      const googlePayload = {
        gmailClientId,
        gmailClientSecret,
        gmailRefreshToken
      };

      const [mailRes, googleRes] = await Promise.all([
        api.put<any>('/settings/mail', mailPayload),
        api.put<any>('/settings/google', googlePayload)
      ]);

      if (mailRes.success && googleRes.success) {
        setSuccess('郵件與 Gmail API 設定已儲存！');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('儲存失敗，請檢查權限或連線。');
      }
    } catch {
      setError('網路連線錯誤');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testEmail) return;
    setTestSending(true);
    setTestResult('');
    try {
      const data = await api.post<any>('/settings/mail/test', { to: testEmail });
      setTestResult(data.success ? '測試信已發送！' : (data.error || '發送失敗'));
    } catch {
      setTestResult('網路連線錯誤');
    } finally {
      setTestSending(false);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> 返回系統設定
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            📧 郵件與 Gmail API 設定
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            配置 SaaS 平台全域發信功能，系統將使用此處設定的 Gmail 憑證透過 OAuth2 寄送通知。
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 active:bg-primary-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm shadow-sm flex items-center gap-2">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg text-sm shadow-sm flex items-center gap-2">
          <span>✅</span>
          <div>{success}</div>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Gmail API Credentials */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-primary-500"></div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🔑 Gmail API OAuth2 憑證
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4 pt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={gmailClientId} onChange={(e) => setGmailClientId(e.target.value)} placeholder="您的 Google OAuth Client ID" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={gmailClientSecret} onChange={(e) => setGmailClientSecret(e.target.value)} placeholder="您的 Google OAuth Client Secret" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Refresh Token</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="password" value={gmailRefreshToken} onChange={(e) => setGmailRefreshToken(e.target.value)} placeholder="您的 Refresh Token (須具備 Gmail 寄信權限)" />
            </div>
          </div>
        </div>

        {/* Section 2: Sender Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            👤 寄件人資訊
          </h2>
          <p className="text-xs text-gray-400">
            決定收件者收到信件時顯示的寄件者暱稱與回信地址。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">寄件者名稱 (Sender Name)</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="例：夏特平台管理中心" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">回覆電子郵件 (Sender Email)</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="noreply@shutterorder.com" />
            </div>
          </div>
        </div>

        {/* Section 3: Welcome Email Template */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            ✨ 歡迎信範本 (租約開通信)
          </h2>
          <p className="text-xs text-gray-400">
            設定新增品牌時發送給客戶的通知信。支援以下變數標籤：<br />
            <span className="text-primary-600 font-mono bg-primary-50 px-1 rounded">{`{tenantName}`}</span> 品牌名稱、
            <span className="text-primary-600 font-mono bg-primary-50 px-1 rounded">{`{expirationDate}`}</span> 到期日、
            <span className="text-primary-600 font-mono bg-primary-50 px-1 rounded">{`{storeUrl}`}</span> 前台網址、
            <span className="text-primary-600 font-mono bg-primary-50 px-1 rounded">{`{adminUrl}`}</span> 後台網址、
            <span className="text-primary-600 font-mono bg-primary-50 px-1 rounded">{`{erpUrl}`}</span> ERP網址
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">信件主旨</label>
              <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm" type="text" value={welcomeSubject} onChange={(e) => setWelcomeSubject(e.target.value)} placeholder="例：感謝您使用夏特餐飲管理平台！您的專屬網址已開通" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">信件內容</label>
              <textarea 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none placeholder:text-gray-400 shadow-sm min-h-[200px]" 
                value={welcomeBody} 
                onChange={(e) => setWelcomeBody(e.target.value)} 
                placeholder="親愛的客戶您好，&#10;&#10;感謝您選擇我們的服務！&#10;您的專屬前台網址為：{storeUrl}&#10;後台管理網址為：{adminUrl}&#10;ERP 網址為：{erpUrl}&#10;&#10;租約到期日：{expirationDate}&#10;&#10;祝您生意興隆！"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Test Email */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            ✉️ 發送測試信
          </h2>
          <p className="text-xs text-gray-400">
            儲存設定後，您可以發送一封測試信來確認 Gmail API 是否正確連線。
          </p>
          <div className="flex gap-3">
            <input 
              type="email" 
              placeholder="輸入接收測試信的信箱" 
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            />
            <button 
              onClick={handleTestEmail}
              disabled={testSending || !testEmail}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {testSending ? '發送中...' : '發送測試'}
            </button>
          </div>
          {testResult && (
            <div className={`mt-3 text-sm p-3 rounded-lg ${testResult.includes('失敗') || testResult.includes('錯誤') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {testResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
