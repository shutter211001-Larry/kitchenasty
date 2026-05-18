import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsMail() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [encryption, setEncryption] = useState<'none' | 'tls' | 'ssl'>('none');

  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    fetch('/api/settings/mail', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.smtpHost) setSmtpHost(d.smtpHost);
          if (d.smtpPort) setSmtpPort(d.smtpPort);
          if (d.smtpUser) setSmtpUser(d.smtpUser);
          if (d.smtpPass) setSmtpPass(d.smtpPass);
          if (d.senderName) setSenderName(d.senderName);
          if (d.senderEmail) setSenderEmail(d.senderEmail);
          if (d.encryption) setEncryption(d.encryption);
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
      const res = await fetch('/api/settings/mail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          senderName,
          senderEmail,
          encryption,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.smtpPass) setSmtpPass(data.data.smtpPass);
        setSuccess('郵件伺服器設定已更新');
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

  async function handleTestEmail() {
    if (!testEmail) return;
    setTestSending(true);
    setTestResult('');
    try {
      const res = await fetch('/api/settings/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      setTestResult(data.success ? '測試信已發送！' : (data.error || '發送失敗'));
    } catch {
      setTestResult('網路連線錯誤');
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium flex items-center gap-1">
            <span>&larr;</span> 返回系統設定
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            ⚙️ 郵件伺服器設定 (SMTP)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            配置系統發送通知與驗證信所使用的 SMTP 發信伺服器連線參數。
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 active:bg-primary-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>儲存中...</span>
            </>
          ) : (
            '儲存設定'
          )}
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
        {/* Section 1: SMTP server configuration */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-indigo-500"></div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🔌 SMTP 連線參數配置
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP 主機 (Host)</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP 連接埠 (Port)</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP 帳號 (User)</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP 密碼 (Password)</label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">加密方式 (Encryption)</label>
              <select
                value={encryption}
                onChange={(e) => setEncryption(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer font-medium"
              >
                <option value="none">無 (None) - Port 25 / 8025</option>
                <option value="tls">STARTTLS - Port 587 (建議)</option>
                <option value="ssl">SSL/TLS - Port 465</option>
              </select>
            </div>
            <div className="flex items-center">
              <p className="text-xs text-gray-400 mt-5 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 w-full">
                💡 <b>使用小常識：</b> Gmail 帳號請先至 Google 帳戶啟用「兩步驟驗證」，並為本系統產生一組專屬的 <b>「應用程式密碼」</b> 作為 SMTP 密碼登入。
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Sender Info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            👤 寄件人資訊欄位
          </h2>
          <p className="text-xs text-gray-400">
            決定顧客收到信件時，信箱收件箱中顯示的寄件者暱稱與回信地址。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">寄件者顯示名稱 (Sender Name)</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                placeholder="例：KitchenAsty 官方總部"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">發件電子郵件 (Sender Email)</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                placeholder="noreply@kitchenasty.com"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Test Email */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            🧪 測試發送信件連線
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            在儲存設定後，您可以輸入個人的 Email 地址來發送一封測試郵件，以即時確認 SMTP 伺服器與發信資訊是否設定成功。
          </p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">測試收件者電子郵件</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                placeholder="name@example.com"
              />
            </div>
            <button
              onClick={handleTestEmail}
              disabled={testSending || !testEmail}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black active:bg-gray-800 disabled:opacity-50 shadow-md transition-all flex items-center gap-1.5 h-[42px]"
            >
              {testSending ? '傳送中...' : '🚀 發送測試信'}
            </button>
          </div>
          {testResult && (
            <div className={`mt-3 p-3 rounded-xl text-xs font-semibold ${
              testResult.includes('成功') || testResult.includes('sent')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
