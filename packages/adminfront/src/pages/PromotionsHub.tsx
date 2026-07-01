import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import CouponList from './CouponList.js';
import CustomerLoyalty from './CustomerLoyalty.js';

export default function PromotionsHub() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'coupons' | 'loyalty'>('coupons');

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'coupons'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {t('promotionsHub.couponsAndEvents')}
          </button>

          <button
            onClick={() => setActiveTab('loyalty')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'loyalty'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {t('promotionsHub.loyaltyAndRewards')}
          </button>
        </nav>
      </div>

      <div className="flex-1">
        {activeTab === 'coupons' && <CouponList />}
        {activeTab === 'loyalty' && <CustomerLoyalty />}
      </div>
    </div>
  );
}
