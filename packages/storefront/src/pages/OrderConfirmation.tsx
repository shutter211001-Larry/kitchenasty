import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext.js';

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const { settings } = useTheme();
  const order = location.state?.order;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-main mb-2">{t('orderConfirmation.title')}</h1>
      <p className="text-sub mb-2">{t('orderConfirmation.thankYou')}</p>

      {order?.pickupNumber && (
        <div className="mb-8">
          <p className="text-sm text-hint mb-1">您的取餐號碼 / Pickup No.</p>
          <div className="text-6xl font-black text-primary-600 tracking-tighter">
            {order.pickupNumber}
          </div>
        </div>
      )}

      {(order?.orderNumber || id) && (
        <p className="text-sm text-hint mb-6">
          {t('orderConfirmation.orderNumber')} {order?.orderNumber ? `#${order.orderNumber}` : `ID: ${id}`}
        </p>
      )}

      {order && (
        <div className="surface-card rounded-xl shadow-sm border p-6 text-left mb-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-hint">{t('checkout.orderType')}</span>
              <p className="font-medium text-main">{order.orderType}</p>
            </div>
            <div>
              <span className="text-hint">{t('orders.status')}</span>
              <p className="font-medium text-main">{order.status}</p>
            </div>
            <div>
              <span className="text-hint">{t('checkout.subtotal')}</span>
              <p className="font-medium text-main">${order.subtotal?.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-hint">{t('checkout.total')}</span>
              <p className="font-bold text-primary-600">${order.total?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4">
        {settings.navShowMenu && (
          <Link
            to="/menu"
            className="btn-primary"
          >
            {t('orderConfirmation.orderMore')}
          </Link>
        )}
        <Link
          to="/"
          className="border border-gray-300 text-sub px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
}
