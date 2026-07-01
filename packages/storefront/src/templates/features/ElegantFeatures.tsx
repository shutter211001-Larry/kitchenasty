import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.js';
import { getTranslated } from '../../utils/translation.js';

interface FeaturesProps {
  features: Array<{ icon: string; title: string; description: string }> | null;
  t: (key: string) => string;
  lang?: string;
}

const defaultIcons: Record<string, React.ReactNode> = {
  clock: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  clipboard: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  calendar: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
};

export default function ElegantFeatures({ features, t, lang = 'zh-TW' }: FeaturesProps) {const { settings } = useTheme();

  const items = features?.length ? features.filter(f => {
              if (!settings.navShowLocations && (f.title.includes(t('autoGen.store.key113')) || f.title.includes(t('autoGen.store.key114')) || f.title.includes(t('autoGen.store.key115')))) return false;
              if ((!settings.navShowReservations || !settings.reservationSettings?.enabled) && f.title.includes(t('autoGen.store.key116'))) return false;
              return true;
            }) : [
    settings.orderSettings?.deliveryEnabled && { icon: 'clock', title: t('home.fastDelivery'), description: t('home.fastDeliveryDesc') },
    settings.navShowLocations && { icon: 'clipboard', title: t('home.easyOrdering'), description: t('home.easyOrderingDesc') },
    settings.navShowReservations && settings.reservationSettings?.enabled && { icon: 'calendar', title: t('home.tableReservations'), description: t('home.tableReservationsDesc') },
  ].filter(Boolean) as Array<{ icon: string; title: string; description: string }>;

  return (
    <section className="py-20 px-4 bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-primary-600 mb-3">
            {t('home.whyChooseUs')}
          </h2>
          <div className="w-12 h-px bg-gray-300 dark:bg-gray-700 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((feature, i) => (
            <div
              key={i}
              className="text-center p-8 border border-gray-100 dark:border-gray-800 rounded-sm hover:border-primary-200 dark:hover:border-primary-800 transition-colors duration-300"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-gray-200 dark:border-gray-700 text-primary-600 mb-6">
                {defaultIcons[feature.icon] ?? (
                  <span className="text-lg font-light">{feature.icon}</span>
                )}
              </div>
              <h3 className="text-lg font-light tracking-wide text-gray-900 dark:text-white mb-3 uppercase">{getTranslated(feature.title, (feature as any).translations?.title, lang)}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{getTranslated(feature.description, (feature as any).translations?.description, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
