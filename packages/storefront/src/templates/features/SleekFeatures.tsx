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

export default function SleekFeatures({ features, t, lang = 'zh-TW' }: FeaturesProps) {
  const { t } = useTranslation();

  const { settings } = useTheme();

  const items = features?.length ? features.filter(f => {
              if (!settings.navShowLocations && (f.title.includes(t('autoGen.store.key133')) || f.title.includes(t('autoGen.store.key134')) || f.title.includes(t('autoGen.store.key135')))) return false;
              if ((!settings.navShowReservations || !settings.reservationSettings?.enabled) && f.title.includes(t('autoGen.store.key136'))) return false;
              return true;
            }) : [
    settings.orderSettings?.deliveryEnabled && { icon: 'clock', title: t('home.fastDelivery'), description: t('home.fastDeliveryDesc') },
    settings.navShowLocations && { icon: 'clipboard', title: t('home.easyOrdering'), description: t('home.easyOrderingDesc') },
    settings.navShowReservations && settings.reservationSettings?.enabled && { icon: 'calendar', title: t('home.tableReservations'), description: t('home.tableReservationsDesc') },
  ].filter(Boolean) as Array<{ icon: string; title: string; description: string }>;

  return (
    <section className="py-20 px-4 bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          {t('home.whyChooseUs')}
        </h2>
        <p className="text-gray-500 text-center mb-14 max-w-md mx-auto text-sm">
          {t('home.whyChooseUsDesc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((feature, i) => (
            <div
              key={i}
              className="relative group bg-gray-900 rounded-xl p-8 border border-gray-800 hover:border-primary-500/50 transition-all duration-500"
            >
              <div className="absolute inset-0 rounded-xl bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-gray-800 group-hover:bg-primary-500/10 flex items-center justify-center text-gray-400 group-hover:text-primary-400 mb-5 transition-colors duration-300">
                  {defaultIcons[feature.icon] ?? (
                    <span className="text-lg font-semibold">{feature.icon}</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{getTranslated(feature.title, (feature as any).translations?.title, lang)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{getTranslated(feature.description, (feature as any).translations?.description, lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
