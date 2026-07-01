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

export default function MinimalFeatures({ features, t, lang = 'zh-TW' }: FeaturesProps) {const { settings } = useTheme();

  const items = features?.length ? features.filter(f => {
              if (!settings.navShowLocations && (f.title.includes(t('autoGen.store.key117')) || f.title.includes(t('autoGen.store.key118')) || f.title.includes(t('autoGen.store.key119')))) return false;
              if ((!settings.navShowReservations || !settings.reservationSettings?.enabled) && f.title.includes(t('autoGen.store.key120'))) return false;
              return true;
            }) : [
    settings.orderSettings?.deliveryEnabled && { icon: 'clock', title: t('home.fastDelivery'), description: t('home.fastDeliveryDesc') },
    settings.navShowLocations && { icon: 'clipboard', title: t('home.easyOrdering'), description: t('home.easyOrderingDesc') },
    settings.navShowReservations && settings.reservationSettings?.enabled && { icon: 'calendar', title: t('home.tableReservations'), description: t('home.tableReservationsDesc') },
  ].filter(Boolean) as Array<{ icon: string; title: string; description: string }>;

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-2xl mx-auto">
        <ul className="divide-y border-input">
          {items.map((feature, i) => (
            <li key={i} className="flex items-start gap-5 py-8 first:pt-0 last:pb-0">
              <span className="text-hint mt-0.5 shrink-0">
                {defaultIcons[feature.icon] ?? (
                  <span className="text-lg">{feature.icon}</span>
                )}
              </span>
              <div>
                <h3 className="text-base font-medium text-main mb-1">
                  {getTranslated(feature.title, (feature as any).translations?.title, lang)}
                </h3>
                <p className="text-sm text-sub leading-relaxed">
                  {getTranslated(feature.description, (feature as any).translations?.description, lang)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
