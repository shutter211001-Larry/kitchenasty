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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

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
            {/* LINE Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-input bg-surface/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#06C755]/10 text-[#06C755]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-main">LINE</h3>
                  <p className="text-xs text-sub mt-0.5">
                    {user.lineUserId 
                      ? `已連結: ${user.lineDisplayName || '已授權用戶'}` 
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
                  onClick={async () => {
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
                      const res = await fetch(`${API_BASE}/line/bind`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}` 
                        },
                        body: JSON.stringify({ lineUserId: profile.userId, lineDisplayName: profile.displayName }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert('LINE 連結成功！');
                        window.location.reload();
                      } else {
                        alert(data.error);
                      }
                    } catch (err) {
                      alert('操作失敗');
                    }
                  }}
                  className="px-4 py-2 text-sm font-bold bg-[#06C755] text-white rounded-lg hover:bg-[#05b34c] transition-colors"
                >
                  連結至 LINE 帳號
                </button>
              )}
            </div>

            {/* Google Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-input bg-surface/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white border shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-main">Google</h3>
                  <p className="text-xs text-sub mt-0.5">
                    {(user as any).googleId 
                      ? `已連結: ${(user as any).googleEmail || 'Google 帳號'}` 
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
                            } else {
                              alert(data.error || '連結失敗');
                            }
                          } catch (err: any) {
                            console.error('LIFF Error:', err);
                            alert('LINE 連結失敗: ' + (err.message || '未知錯誤'));
                          }
                        }}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-[#06C755] text-white rounded-xl font-bold hover:bg-[#05b34c] transition-all shadow-lg shadow-green-100"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2z" />
                        </svg>
                        一鍵連結 LINE 帳號
                      </button>
                      <p className="text-[10px] text-center text-hint mt-2">
                        使用 LINE 官方快速連結技術，安全且無需輸入 ID
                      </p>
                    </div>
                  ) : settings.lineSettings?.officialAccountUrl && (
                    /* Manual Binding Link if no LIFF ID */
                    <div className="mb-4">
                      <a
                        href={settings.lineSettings.officialAccountUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-3 bg-[#06C755] text-white rounded-xl font-bold hover:bg-[#05b34c] transition-all shadow-lg shadow-green-100"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2z" />
                        </svg>
                        一鍵關注官方帳號
                      </a>
                    </div>
                  )}

                  {!settings.lineSettings?.liffId && (
                    <>
                      <div className="text-xs bg-gray-50 text-sub p-4 rounded-xl border border-gray-100">
                        <p className="font-bold text-main mb-2">綁定三步驟：</p>
                        <ol className="list-decimal list-inside space-y-2">
                          <li>點擊上方按鈕關注我們的官方帳號</li>
                          <li>在 LINE 對話框輸入 「<span className="text-primary-600 font-bold">id</span>」 並送出</li>
                          <li>將得到的 ID 貼回下方完成連結</li>
                        </ol>
                      </div>

                      <div className="flex gap-2">
                        <input
                          id="lineIdInput"
                          type="text"
                          placeholder="貼上您的 LINE ID (U...)"
                          className="flex-1 px-4 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById('lineIdInput') as HTMLInputElement;
                            const lineUserId = input.value.trim();
                            if (!lineUserId) return alert('請輸入 ID');
                            try {
                              const res = await fetch(`${API_BASE}/line/bind`, {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}` 
                              },
                              body: JSON.stringify({ lineUserId }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              window.location.reload();
                            } else {
                              alert(data.error);
                            }
                          } catch (err) {
                            alert('綁定失敗');
                          }
                        }}
                        className="px-6 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                      >
                        確認連結
                      </button>
                    </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone - Collapsible for safety */}
        <div className="mt-12 pt-12 border-t">
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
                  
                  <div className="space-y-6">
                    {/* LINE Unbind */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-main">{t('account.unbindLine')}</h4>
                        <p className="text-xs text-sub mt-1">解除與 LINE 帳號的連結，但保留本站會員資料。</p>
                      </div>
                      <button
                        disabled={!user.lineUserId}
                        onClick={() => {
                          if (!(user as any).hasPassword) {
                            setShowPasswordSetup(true);
                            // Scroll to the password setup area
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          } else {
                            if (confirm(t('account.unbindLineConfirm') || '確定要解除 LINE 連結嗎？')) {
                              handleUnbind();
                            }
                          }
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          user.lineUserId 
                            ? 'text-red-600 border-red-200 hover:bg-red-50' 
                            : 'text-gray-400 border-gray-100 cursor-not-allowed'
                        }`}
                      >
                        {t('account.unbindLine')}
                      </button>
                    </div>

                    <div className="h-px bg-red-100"></div>

                    {/* Delete Account */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-red-700">{t('footer.deleteAccount')}</h4>
                        <div className="mt-2 p-4 bg-white border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600 leading-relaxed font-medium">
                            {t('footer.deleteAccountWarning')}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={async () => {
                          const firstCheck = confirm(t('footer.deleteAccountWarning'));
                          if (!firstCheck) return;
                          
                          const finalCheck = confirm(t('footer.deleteAccountFinalCheck'));
                          if (!finalCheck) return;

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
            </div>
          </details>
        </div>

        {/* Logout */}
        <div className="mt-8 flex justify-center">
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
