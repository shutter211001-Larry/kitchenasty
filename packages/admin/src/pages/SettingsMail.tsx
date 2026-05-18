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

  const [emailBrandName, setEmailBrandName] = useState('KitchenAsty');
  const [emailHeaderColor, setEmailHeaderColor] = useState('#f97316');
  const [emailBgColor, setEmailBgColor] = useState('#f3f4f6');

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
          if (d.emailBrandName) setEmailBrandName(d.emailBrandName);
          if (d.emailHeaderColor) setEmailHeaderColor(d.emailHeaderColor);
          if (d.emailBgColor) setEmailBgColor(d.emailBgColor);
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
          emailBrandName,
          emailHeaderColor,
          emailBgColor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.smtpPass) setSmtpPass(data.data.smtpPass);
        setSuccess('郵件設定已更新');
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

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium flex items-center gap-1">
            <span>&larr;</span> 返回系統設定
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            ✉️ 郵件通知自訂與設計
          </h1>
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

      {/* Main Grid System */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Config Panel (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Brand & Layout Customization */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-indigo-500"></div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
              🎨 郵件品牌與設計自訂 (Email Decoration)
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              設定系統發送給顧客及店員的 HTML 郵件外觀，風格將自動套用至所有 transactional emails。
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">信件頂部大標名稱 (Brand Title)</label>
                <input
                  type="text"
                  value={emailBrandName}
                  onChange={(e) => setEmailBrandName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"
                  placeholder="輸入信件大標，例：KitchenAsty"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    橫幅與主色調 (Banner & Primary Color)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">#</span>
                      <input
                        type="text"
                        value={emailHeaderColor.replace('#', '')}
                        onChange={(e) => setEmailHeaderColor('#' + e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono uppercase"
                        placeholder="F97316"
                      />
                    </div>
                    <input
                      type="color"
                      value={emailHeaderColor}
                      onChange={(e) => setEmailHeaderColor(e.target.value)}
                      className="w-12 h-[38px] border border-gray-300 rounded-xl cursor-pointer p-0.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    郵件外層背景底色 (Page Background)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">#</span>
                      <input
                        type="text"
                        value={emailBgColor.replace('#', '')}
                        onChange={(e) => setEmailBgColor('#' + e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono uppercase"
                        placeholder="F3F4F6"
                      />
                    </div>
                    <input
                      type="color"
                      value={emailBgColor}
                      onChange={(e) => setEmailBgColor(e.target.value)}
                      className="w-12 h-[38px] border border-gray-300 rounded-xl cursor-pointer p-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: SMTP server configuration */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              ⚙️ SMTP 伺服器設定
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 主機 (Host)</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 連接埠 (Port)</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 帳號 (User)</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 密碼 (Password)</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">加密方式 (Encryption)</label>
                <select
                  value={encryption}
                  onChange={(e) => setEncryption(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="none">無 (None)</option>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                </select>
              </div>
              <div className="flex items-center">
                <p className="text-xs text-gray-400 mt-4">
                  提示：Gmail 建議使用 <b>Port 587 + TLS</b>。如果在 Railway 雲端有問題，請嘗試 <b>Port 465 + SSL</b>。
                </p>
              </div>
            </div>

            <h2 className="text-md font-bold text-gray-900 pt-4 border-t border-gray-100 flex items-center gap-2">
              👤 發信人資料
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">寄件者顯示名稱 (Sender Name)</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="您的店名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">發件電子郵件 (Sender Email)</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="noreply@yourshop.com"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Test Email */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              🧪 測試發送信件
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              請在此輸入您的信箱，發送測試郵件來檢驗連線設定與裝飾設計是否正確。
            </p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">收件者電子郵件</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="name@example.com"
                />
              </div>
              <button
                onClick={handleTestEmail}
                disabled={testSending || !testEmail}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black active:bg-gray-800 disabled:opacity-50 shadow-md transition-all flex items-center gap-1.5"
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

        {/* Right Column: Live Email Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              👀 郵件外觀即時預覽 (Email Live Preview)
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              以下呈現顧客收到的信件樣貌。調整左側配色與標題時，右側將即時更新！
            </p>

            {/* Simulated Email Browser Mockup */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-gray-50 flex flex-col">
              
              {/* Browser Header Bar */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2 text-xs">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 block"></span>
                </div>
                <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-gray-400 flex-1 text-center font-mono select-none overflow-hidden text-ellipsis whitespace-nowrap">
                  inbox / {emailBrandName} / 訂單通知
                </div>
              </div>

              {/* Subject details */}
              <div className="bg-white px-4 py-3 border-b border-gray-100 text-xs flex flex-col gap-1 text-gray-500">
                <div>
                  <span className="font-semibold text-gray-700">寄件人：</span>
                  {senderName || 'KitchenAsty'} &lt;{senderEmail || 'noreply@kitchenasty.com'}&gt;
                </div>
                <div>
                  <span className="font-semibold text-gray-700">主　旨：</span>
                  <span className="text-gray-900 font-medium">
                    訂單 #KA-1082 狀態更新 - 可取餐
                  </span>
                </div>
              </div>

              {/* Dynamic Outer Background Area */}
              <div
                style={{ backgroundColor: emailBgColor }}
                className="p-6 transition-all duration-300 flex justify-center items-start min-h-[380px]"
              >
                {/* Dynamic Inner HTML Email Card */}
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
                  
                  {/* Dynamic Color Banner Header */}
                  <div
                    style={{ backgroundColor: emailHeaderColor }}
                    className="py-6 px-4 text-center transition-all duration-300"
                  >
                    <h1 className="text-white text-xl font-bold tracking-wide m-0 drop-shadow-sm select-none">
                      {emailBrandName}
                    </h1>
                  </div>

                  {/* Mail Body Card */}
                  <div className="p-6 bg-white space-y-4 text-left">
                    <h2 className="text-gray-900 font-bold text-lg m-0 flex items-center gap-1.5">
                      🔔 訂單狀態更新
                    </h2>
                    <p className="text-xs text-gray-400 m-0">
                      訂單編號 <strong className="text-gray-700">#KA-1082</strong>
                    </p>

                    <div className="bg-gray-50 border border-gray-200/60 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ color: emailHeaderColor }}
                          className="font-bold text-sm transition-all"
                        >
                          ● 可取餐
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 m-0 leading-relaxed whitespace-pre-wrap">
                        王小明 您好：
                        您的餐點已準備就緒，歡迎您隨時前往門市取餐！
                        
                        感謝您的訂購！
                      </p>
                    </div>

                    <p className="text-[10px] text-gray-400 m-0 text-center border-t border-gray-100 pt-3">
                      本郵件由系統自動發送，請勿直接回信。
                    </p>
                  </div>

                </div>
              </div>

            </div>

            <div className="mt-4 flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-xl">
              <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                💡 小訣竅
              </span>
              <p className="text-[10px] text-gray-400 text-right m-0">
                點選取色器可以直接微調喜愛的顏色，或直接填寫 HEX 十六進位代碼。
              </p>
            </div>

          </div>
        </div>

      </div>

      <div className="flex justify-end pt-6 mt-8 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          {saving ? '儲存中...' : '儲存所有郵件與外觀設定'}
        </button>
      </div>
    </div>
  );
}
