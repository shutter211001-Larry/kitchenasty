import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext.js';

export default function Account() {
  const { t } = useTranslation();
  const { user, token, isLoading, logout } = useAuth();
  const { settings } = useTheme();
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/loyalty/balance', {
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
            <Link to="/account/orders" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-main">{t('account.orderHistory')}</h3>
              <p className="text-sm text-sub mt-1">{t('account.orderHistoryDesc')}</p>
            </Link>
            {settings.navShowReservations && (
              <Link to="/reservations" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <h3 className="font-medium text-main">{t('nav.reservations')}</h3>
                <p className="text-sm text-sub mt-1">{t('reservations.myReservations')}</p>
              </Link>
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
