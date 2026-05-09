import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext.js';
import { API_BASE } from '../lib/api.js';

export default function Account() {
  const { t } = useTranslation();
  const { user, token, isLoading, logout } = useAuth();
  const { settings } = useTheme();
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);

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
  }, [token]);

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
          <h2 className="text-lg font-semibold text-main mb-4">{t('account.personalInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-hint mb-1">{t('auth.name')}</label>
              <p className="text-main font-medium">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm text-hint mb-1">{t('account.emailLabel')}</label>
              <p className="text-main">{user.email}</p>
            </div>
            {user.phone && (
              <div>
                <label className="block text-sm text-hint mb-1">{t('account.phoneLabel')}</label>
                <p className="text-main">{user.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Loyalty Points */}
        {loyaltyPoints !== null && (
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
            {settings.navShowReservations && (
              <Link to="/reservations" className="p-4 bg-surface rounded-lg border border-input hover:bg-surface/80 transition-colors">
                <h3 className="font-medium text-main">{t('nav.reservations')}</h3>
                <p className="text-sm text-sub mt-1">{t('reservations.myReservations')}</p>
              </Link>
            )}
          </div>
        </div>

        {/* LINE Integration */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 text-[#06C755]">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2zm6.603 10.965h-1.636a.23.23 0 00-.231.231v.006c0 .128.103.232.231.232h1.636a.232.232 0 00.231-.232v-.006a.23.23 0 00-.231-.231zm-2.842 0h-1.636a.23.23 0 00-.23.231v.006c0 .128.103.232.23.232h1.636a.232.232 0 00.232-.232v-.006a.232.232 0 00-.232-.231zm-2.841 0h-1.636a.232.232 0 00-.232.231v.006c0 .128.104.232.232.232h1.636a.232.232 0 00.231-.232v-.006a.23.23 0 00-.231-.231z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-main">{t('account.lineBinding')}</h2>
          </div>
          <div className="bg-surface rounded-lg border border-input p-4">
            {user.lineUserId ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-main flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {t('account.lineBound')}
                  </p>
                  <p className="text-xs text-sub mt-1">
                    {user.lineDisplayName || t('account.lineId')}: {user.lineUserId}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('確定要解除 LINE 綁定嗎？')) return;
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
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                >
                  {t('account.unbindLine')}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-sub mb-4">{t('account.lineBindingDesc')}</p>
                <div className="space-y-4">
                  <div className="text-xs bg-primary-50 text-primary-700 p-3 rounded-lg border border-primary-100">
                    <p className="font-bold mb-1">如何綁定：</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>關注我們的 LINE 官方帳號</li>
                      <li>在對話框輸入 「id」 並送出</li>
                      <li>將得到的 ID 填入下方欄位點擊綁定</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="lineIdInput"
                      type="text"
                      placeholder="請輸入 LINE User ID (U...)"
                      className="flex-1 px-3 py-2 text-sm border border-input rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
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
                      className="px-6 py-2 text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg transition-colors shadow-sm"
                    >
                      {t('account.bindLine')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="p-6">
          <button
            onClick={logout}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
