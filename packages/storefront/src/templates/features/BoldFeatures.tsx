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

export default function BoldFeatures({ features, t, lang = 'zh-TW' }: FeaturesProps) {const { settings } = useTheme();

  const items = features?.length ? features.filter(f => {
              if (!settings.navShowLocations && (f.title.includes(t('autoGen.store.key105')) || f.title.includes(t('autoGen.store.key106')) || f.title.includes(t('autoGen.store.key107')))) return false;
              if ((!settings.navShowReservations || !settings.reservationSettings?.enabled) && f.title.includes(t('autoGen.store.key108'))) return false;
              return true;
            }) : [
    settings.orderSettings?.deliveryEnabled && { icon: 'clock', title: t('home.fastDelivery'), description: t('home.fastDeliveryDesc') },
    settings.navShowLocations && { icon: 'clipboard', title: t('home.easyOrdering'), description: t('home.easyOrderingDesc') },
    settings.navShowReservations && settings.reservationSettings?.enabled && { icon: 'calendar', title: t('home.tableReservations'), description: t('home.tableReservationsDesc') },
  ].filter(Boolean) as Array<{ icon: string; title: string; description: string }>;

  return (
    <section className="bg-gray-900 dark:bg-black py-0">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-700">
          {items.map((feature, i) => (
            <div key={i} className="flex items-center gap-6 px-8 py-10 md:py-14">
              <span className="text-5xl font-black text-primary-500 shrink-0 leading-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-primary-400">
                    {defaultIcons[feature.icon] ?? (
                      <span className="text-lg font-bold">{feature.icon}</span>
                    )}
                  </span>
                  <h3 className="text-xl font-extrabold text-white uppercase tracking-wide">{getTranslated(feature.title, (feature as any).translations?.title, lang)}</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{getTranslated(feature.description, (feature as any).translations?.description, lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
