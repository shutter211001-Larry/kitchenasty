import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {t('home.heroTitle')}
            </h1>
            <p className="text-lg text-primary-100 mb-8">
              {t('home.heroDescription')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                {t('home.viewMenu')}
              </Link>
              <Link
                to="/locations"
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                {t('home.findLocation')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('home.fastDelivery')}</h3>
            <p className="text-gray-600 text-sm">
              {t('home.fastDeliveryDesc')}
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('home.easyOrdering')}</h3>
            <p className="text-gray-600 text-sm">
              {t('home.easyOrderingDesc')}
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('home.tableReservations')}</h3>
            <p className="text-gray-600 text-sm">
              {t('home.tableReservationsDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('home.readyToOrder')}</h2>
          <p className="text-gray-600 mb-6">
            {t('home.readyToOrderDesc')}
          </p>
          <Link
            to="/register"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            {t('home.createAccount')}
          </Link>
        </div>
      </section>
    </>
  );
}
