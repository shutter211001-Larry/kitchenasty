import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface SettingsCard {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  roles: ('SUPER_ADMIN' | 'MANAGER')[];
}

interface SettingsGroup {
  categoryName: string;
  description: string;
  cards: SettingsCard[];
}

export default function Settings() {
  const { t } = useTranslation();
    const groups: SettingsGroup[] = [
      {
        categoryName: t('settings.coreOperationsManagement'),
        description: t('settings.manageBrandAndFranchise'),
        cards: [
          {
            title: t('settings.advancedSettings'),
            description: t('settings.maintenanceAndRateLimits'),
            link: '/settings/advanced',
            roles: ['SUPER_ADMIN'],
            icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L12 4.37m-5.68 5.7h15.08M4.26 19.72l15.48-15.48" />
              </svg>
            ),
          },
          {
            title: '郵件與 Gmail API 設定',
            description: '配置系統全域發信功能與 Gmail OAuth2 憑證',
            link: '/settings/mail',
            roles: ['SUPER_ADMIN'],
            icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            ),
          },
        ]
      }
    ];

  const { user } = useAuth();

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-2">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('settings.systemSettingsCenter')}</h1>
        <p className="text-xs text-gray-500 font-semibold mt-1">{t('settings.manageBrandOperationsSettings')}</p>
      </div>

      <div className="space-y-12">
        {groups.map((group) => {
          const visibleCards = group.cards.filter(
            (card) => user && card.roles.includes(user.role as 'SUPER_ADMIN' | 'MANAGER')
          );

          if (visibleCards.length === 0) return null;

          return (
            <section key={group.categoryName} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-gray-150 pb-2">
                <h2 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2">
                  {group.categoryName}
                </h2>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCards.map((card) => (
                  <Link
                    key={card.link}
                    to={card.link}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-primary-300 hover:scale-[1.01] transition-all duration-200 group relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                  >
                    <div>
                      <div className="text-gray-400 group-hover:text-primary-500 transition-colors mb-3">
                        {card.icon}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1 tracking-tight">{card.title}</h3>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">{card.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
