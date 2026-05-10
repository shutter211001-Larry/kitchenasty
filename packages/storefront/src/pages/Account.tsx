import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext.js';
import { API_BASE } from '../lib/api.js';

export default function Account() {
  const { t } = useTranslation();
  const { user, token, isLoading, logout, updateUser } = useAuth();
  const { settings } = useTheme();
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);
  
  // Merge State
  const [showMergePrompt, setShowMergePrompt] = useState<{ provider: 'google' | 'line', id: string } | null>(null);
  const [mergePassword, setMergePassword] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isSocialVerified, setIsSocialVerified] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const provider = params.get('provider') as 'google' | 'line';
    const socialId = params.get('socialId');
    const verified = params.get('verified');

    if (error === 'conflict' && provider) {
      setShowMergePrompt({ provider, id: socialId || '' });
      if (verified === 'true') {
        setIsSocialVerified(true);
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        updateUser(data.data);
        setIsEditing(false);
      } else {
        alert(data.error || '更新失敗');
      }
    } catch (err) {
      alert('更新失敗，請檢查網路連線');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/loyalty/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLoyaltyPoints(data.data.points);
      })
      .catch(() => {});
  }, [token, user]);

  const handleUnbind = async () => {
    try {
      const res = await fetch(`${API_BASE}/line/unbind`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('操作失敗');
    }
  };

  const handleLineAuth = async () => {
    try {
      const liff = (window as any).liff;
      if (!liff) {
        alert('LINE SDK 尚未載入，請稍候');
        return;
      }
      await liff.init({ liffId: settings.lineSettings!.liffId });
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      const profile = await liff.getProfile();
      // If we got the profile, it means we've successfully re-authenticated.
      setIsSocialVerified(true);
      
      const res = await fetch(`${API_BASE}/line/bind`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ lineUserId: profile.userId, lineDisplayName: profile.displayName }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert('LINE 連結成功！');
        window.location.reload();
      } else {
        const errorMsg = data.error || '';
        if (errorMsg.includes('已被其他會員連結') || errorMsg.includes('已被其他會員綁定')) {
          console.log('Conflict detected, opening merge prompt for:', profile.userId);
          setIsSocialVerified(true);
          setShowMergePrompt({ provider: 'line', id: profile.userId });
        } else {
          alert(errorMsg || '連結失敗');
        }
      }
    } catch (err) {
      alert('操作失敗');
    }
  };

  const handleSetPasswordAndUnbind = async () => {
    if (newPassword.length < 6) {
      alert('密碼長度至少需要 6 位數');
      return;
    }
    setIsSettingPassword(true);
    try {
      // 1. Set password
      const pRes = await fetch(`${API_BASE}/auth/set-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const pData = await pRes.json();
      if (!pData.success) {
        alert(pData.error || '密碼設定失敗');
        setIsSettingPassword(false);
        return;
      }
      // 2. Then unbind
      await handleUnbind();
    } catch (err) {
      alert('系統錯誤，請稍後再試');
      setIsSettingPassword(false);
    }
  };

  const handleMergeSocial = async () => {
    if (!showMergePrompt || (!mergePassword && !isSocialVerified)) return;
    setIsMerging(true);
    try {
      const res = await fetch(`${API_BASE}/auth/social/merge`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          provider: showMergePrompt.provider, 
          socialId: showMergePrompt.id, 
          password: mergePassword 
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || '帳號整合成功！');
        window.location.reload();
      } else {
        alert(data.error || '整合失敗');
      }
    } catch (err) {
      alert('整合過程中發生錯誤');
    } finally {
      setIsMerging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-main mb-8">{t('account.title')}</h1>

      {/* Account Merge Modal (Multi-path Security Check) */}
      {showMergePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-main mb-2">偵測到帳號衝突</h2>
              <p className="text-sm text-sub leading-relaxed mb-6">
                您剛登入的 {showMergePrompt.provider === 'google' ? 'Google' : 'LINE'} 帳號已連結至另一個會員。
                如果您希望整合帳號的 **訂單記錄與紅利點數**，請通過安全驗證。
              </p>

              <div className="space-y-4">
                {/* Option 1: Password (if they have one) */}
                {(user as any).hasPassword ? (
                  <div>
                    <label className="block text-sm font-medium text-hint mb-1">方式 1：輸入目前帳號密碼</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={mergePassword}
                        onChange={(e) => setMergePassword(e.target.value)}
                        placeholder="本站登入密碼"
                        className="flex-1 px-4 py-2 border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        disabled={isMerging || !mergePassword}
                        onClick={handleMergeSocial}
                        className="px-4 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        驗證
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-xs text-sub">您尚未設定本站密碼，建議先設定密碼以強化帳號安全。</p>
                    <button 
                      onClick={() => { setShowMergePrompt(null); setShowPasswordSetup(true); }}
                      className="text-xs font-bold text-primary-600 mt-1 hover:underline"
                    >
                      立即前往設定密碼
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-hint">或使用</span></div>
                </div>

                {/* Option 2: Re-verify Social */}
                <div>
                  <label className="block text-sm font-medium text-hint mb-1">方式 2：重新驗證社交帳號</label>
                  {isSocialVerified ? (
                    <div className="space-y-3">
                      <div className="w-full py-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2 text-green-700 font-bold">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        {showMergePrompt.provider === 'google' ? 'Google' : 'LINE'} 身份核對成功
                      </div>
                      <button
                        onClick={handleMergeSocial}
                        disabled={isMerging}
                        className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 animate-in zoom-in-95 duration-300"
                      >
                        {isMerging ? '整合中...' : '立即合併帳號'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (showMergePrompt.provider === 'google') {
                          window.location.href = `${API_BASE}/auth/google?prompt=select_account&state=${encodeURIComponent('link=true')}&redirectUri=${encodeURIComponent(window.location.origin + '/account')}`;
                        } else {
                          handleLineAuth();
                        }
                      }}
                      className="w-full py-2 border border-primary-200 text-primary-700 text-sm font-bold rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      重新驗證 {showMergePrompt.provider === 'google' ? 'Google' : 'LINE'} 身份
                    </button>
                  )}
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    ⚠️ 整合後，系統將合併兩個帳號的所有記錄。為了您的安全，若您無法通過上述驗證，將無法進行整合。
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowMergePrompt(null);
                    setMergePassword('');
                  }}
                  className="w-full py-2 text-sm text-hint hover:text-sub"
                >
                  取消，維持現狀
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="surface-card rounded-xl shadow-sm border overflow-hidden">
        {/* Profile */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-main">{t('account.personalInfo')}</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                編輯
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  disabled={isSaving}
                  onClick={handleUpdateProfile}
                  className="text-sm font-bold text-green-600 hover:text-green-700 disabled:opacity-50"
                >
                  {isSaving ? '儲存中...' : '儲存'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ name: user.name || '', phone: user.phone || '' });
                  }}
                  className="text-sm font-medium text-hint hover:text-sub"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-hint mb-1">{t('auth.name')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-main font-medium">{user.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-hint mb-1">{t('account.phoneLabel')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-main font-medium">{user.phone || '尚未設定'}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-hint mb-1">{t('account.emailLabel')}</label>
              <p className="text-main bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 italic">{user.email} (不可修改)</p>
            </div>
          </div>
        </div>

        {/* Loyalty Points */}
        {settings.loyaltyProgramEnabled && loyaltyPoints !== null && (
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-main mb-2">Loyalty Points</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary-600">{loyaltyPoints}</span>
              <span className="text-sm text-sub">points (${(loyaltyPoints / 100).toFixed(2)} value)</span>
            </div>
            <p className="text-xs text-hint mt-1">Earn 1 point per $1 spent. 100 points = $1 off your order.</p>
          </div>
        )}

        {/* Quick Links */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-main mb-4">{t('footer.quickLinks')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/account/orders" className="p-4 bg-surface rounded-lg border border-input hover:bg-surface/80 transition-colors">
              <h3 className="font-medium text-main">{t('account.orderHistory')}</h3>
              <p className="text-sm text-sub mt-1">{t('account.orderHistoryDesc')}</p>
            </Link>
            {settings.navShowReservations && settings.reservationSettings?.enabled && (
              <Link to="/reservations" className="p-4 bg-surface rounded-lg border border-input hover:bg-surface/80 transition-colors">
                <h3 className="font-medium text-main">{t('nav.reservations')}</h3>
                <p className="text-sm text-sub mt-1">{t('reservations.myReservations')}</p>
              </Link>
            )}
          </div>
        </div>

        {/* Third-party Accounts */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-main mb-6">{t('account.socialLinking') || '第三方帳號連結'}</h2>
          
          <div className="space-y-6">
            {/* Password Setup UI (Elegant Transition) */}
            {showPasswordSetup && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 mb-4">
                  <h3 className="text-sm font-bold text-primary-900 mb-1">優雅轉移：設定登入密碼</h3>
                  <p className="text-xs text-primary-700 leading-relaxed">
                    為了保障您的權益，在解除連結前，請先為您的 Email ({user.email}) 設定一個密碼。
                    這能確保您未來仍能隨時登入。
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="請輸入新密碼 (至少 6 位)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-4 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    disabled={isSettingPassword}
                    onClick={handleSetPasswordAndUnbind}
                    className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {isSettingPassword ? '設定中...' : '設定並解除連結'}
                  </button>
                  <button
                    onClick={() => setShowPasswordSetup(false)}
                    className="px-4 py-2 text-sm text-sub hover:text-main"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* LINE Row */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border ${user.lineUserId ? 'border-[#06C755]/30 bg-[#06C755]/5' : 'border-input bg-surface/50'} transition-colors`}>
              <div className="flex items-center gap-4">
                {user.lineUserId ? (
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold text-xl shadow-md">
                      {(user.lineDisplayName || 'L')[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#06C755]/10 text-[#06C755]">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2z" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-main">LINE</h3>
                    {user.lineUserId && <span className="px-2 py-0.5 text-[10px] font-bold bg-[#06C755] text-white rounded-full uppercase tracking-wider">已連結</span>}
                  </div>
                  <p className="text-xs text-sub mt-1">
                    {user.lineUserId 
                      ? user.lineDisplayName || '已授權用戶'
                      : '連結後可接收訂單即時通知與快速登入'}
                  </p>
                </div>
              </div>
              
              {user.lineUserId ? (
                <button
                  onClick={() => {
                    if (!(user as any).hasPassword) {
                      setShowPasswordSetup(true);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    } else {
                      if (confirm('確定要解除 LINE 連結嗎？')) handleUnbind();
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                >
                  解除連結
                </button>
              ) : (
                <button
                  onClick={handleLineAuth}
                  className="px-5 py-2.5 text-sm font-bold bg-[#06C755] text-white rounded-lg hover:bg-[#05b34c] transition-colors shadow-sm"
                >
                  連結帳號
                </button>
              )}
            </div>

            {/* Google Row */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border ${(user as any).googleId ? 'border-blue-200 bg-blue-50/50' : 'border-input bg-surface/50'} transition-colors`}>
              <div className="flex items-center gap-4">
                {(user as any).googleId ? (
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                      {((user as any).googleEmail || 'G')[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white border shadow-sm">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-main">Google</h3>
                    {(user as any).googleId && <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full uppercase tracking-wider">已連結</span>}
                  </div>
                  <p className="text-xs text-sub mt-1">
                    {(user as any).googleId 
                      ? (user as any).googleEmail || 'Google 帳號'
                      : '連結 Google 帳號以啟用快速登入'}
                  </p>
                </div>
              </div>
              
              {(user as any).googleId ? (
                <button
                  onClick={async () => {
                    if (!(user as any).hasPassword) {
                      setShowPasswordSetup(true);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    } else {
                      if (!confirm('確定要解除 Google 連結嗎？')) return;
                      try {
                        const res = await fetch(`${API_BASE}/auth/google/unbind`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        if (data.success) {
                          window.location.reload();
                        } else {
                          alert(data.error);
                        }
                      } catch (err) {
                        alert('操作失敗');
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                >
                  解除連結
                </button>
              ) : (
                <a
                  href={`${API_BASE}/auth/google?prompt=select_account&state=${encodeURIComponent(JSON.stringify({ link: true, token: token, redirect: '/account' }))}`}
                  className="px-5 py-2.5 text-sm font-bold bg-white text-main rounded-lg border border-input hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                  連結帳號
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 pt-12 border-t px-6 pb-12">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none text-hint hover:text-sub transition-colors">
              <span className="text-sm font-medium">進階帳號管理選項</span>
              <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            
            <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="surface-card rounded-xl border border-red-100 bg-red-50/30 overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-red-700 mb-4">{t('account.dangerZone') || '危險區域'}</h3>
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={async () => {
                        if (!confirm(t('footer.deleteAccountWarning'))) return;
                        if (!confirm(t('footer.deleteAccountFinalCheck'))) return;

                        try {
                          const res = await fetch(`${API_BASE}/auth/me`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert('帳號已成功刪除。再見！');
                            logout();
                          } else {
                            alert(data.error || '刪除失敗');
                          }
                        } catch (err) {
                          alert('刪除失敗，請聯繫客服');
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                      {t('footer.deleteAccountConfirm')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Logout */}
        <div className="mt-8 mb-8 flex justify-center">
          <button
            onClick={logout}
            className="text-sub hover:text-red-600 font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
