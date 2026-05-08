import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { heroVariants } from '../templates/heroes/index.js';
import { featureVariants } from '../templates/features/index.js';
import { ctaVariants } from '../templates/ctas/index.js';
import type { TemplateId } from '../templates/index.js';
import { getTranslated } from '../utils/translation.js';

export default function Home() {
  const { t, i18n } = useTranslation();
  const { settings } = useTheme();
  const lang = i18n.language;

  const hero = settings.heroSection;
  const features = settings.featuresSection;
  const cta = settings.ctaSection;
  const templateId = (settings.storefrontTemplate || 'classic') as TemplateId;

  const HeroVariant = heroVariants[templateId];
  const FeaturesVariant = featureVariants[templateId];
  const CtaVariant = ctaVariants[templateId];

  // Placeholder to maintain brand identity during lazy loading
  const HeroPlaceholder = (
    <ClassicHero hero={hero} t={t} lang={lang} isPlaceholder={true} />
  );

  return (
    <>
      {/* Hero */}
      {HeroVariant ? (
        <Suspense fallback={HeroPlaceholder}>
          <HeroVariant hero={hero} t={t} lang={lang} />
        </Suspense>
      ) : (
        <ClassicHero hero={hero} t={t} lang={lang} />
      )}

      {/* Features */}
      {FeaturesVariant ? (
        <Suspense fallback={<div className="h-64 animate-pulse bg-surface-soft" />}>
          <FeaturesVariant features={features} t={t} lang={lang} />
        </Suspense>
      ) : (
        <ClassicFeatures features={features} t={t} lang={lang} />
      )}

      {/* CTA */}
      {CtaVariant ? (
        <Suspense fallback={<div className="h-48 animate-pulse bg-surface-soft" />}>
          <CtaVariant cta={cta} t={t} lang={lang} />
        </Suspense>
      ) : (
        <ClassicCta cta={cta} t={t} lang={lang} />
      )}
    </>
  );
}

/* ── Classic variants (inline, matching original) ─────────────── */

interface HeroSection {
  title?: string;
  subtitle?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundImage?: string;
}

function ClassicHero({
  hero,
  t,
  lang,
  isPlaceholder = false
}: {
  hero: HeroSection | null;
  t: (k: string) => string;
  lang: string;
  isPlaceholder?: boolean;
}) {
  const { settings } = useTheme();

  // Use custom image, or the high-end default we just created for brand identity
  const bgImage = hero?.backgroundImage || '/images/default-hero.png';

  const heroStyle = {
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };

  return (
    <section
      className={`relative min-h-[60vh] flex items-center overflow-hidden surface-brand ${isPlaceholder ? '' : 'animate-in fade-in duration-700'}`}
      style={heroStyle}
    >
      {/* Smart Contrast Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full flex justify-center">
        <div className="max-w-4xl text-center">
          {/* Welcome Message with premium glass panel */}
          <div className="inline-block p-8 lg:p-12 rounded-[2.5rem] glass-panel mb-8 animate-in zoom-in-95 duration-1000">
            <h1 className="text-4xl lg:text-7xl font-black mb-6 leading-tight text-white drop-shadow-2xl">
              {getTranslated(hero?.title || '', (hero as any)?.translations?.title, lang) || t('home.heroTitle')}
            </h1>
            <p className="text-lg lg:text-2xl max-w-2xl mx-auto text-white/90 font-medium drop-shadow-lg">
              {getTranslated(hero?.subtitle || '', (hero as any)?.translations?.subtitle, lang) || t('home.heroDescription')}
            </p>
          </div>

          <div className={`flex flex-wrap gap-6 mt-4 justify-center ${isPlaceholder ? 'opacity-0' : 'animate-in slide-in-from-bottom-4 duration-1000'}`}>
            {settings.navShowMenu && (
              <Link
                to={hero?.ctaPrimaryLink || '/menu'}
                className="bg-white text-primary-700 px-10 py-4 rounded-xl font-bold hover:bg-primary-50 transition-all transform hover:scale-105 shadow-2xl text-lg"
              >
                {getTranslated(hero?.ctaPrimaryText || '', (hero as any)?.translations?.ctaPrimaryText, lang) || t('home.viewMenu')}
              </Link>
            )}
            {hero?.ctaSecondaryText && (
              (() => {
                const link = hero?.ctaSecondaryLink || '/locations';
                if (link === '/locations' && !settings.navShowLocations) return null;
                if (link === '/reservations' && !settings.navShowReservations) return null;
                return (
                  <Link
                    to={link}
                    className="backdrop-blur-md bg-white/10 border-2 border-white/30 text-white px-10 py-4 rounded-xl font-bold hover:bg-white/20 transition-all transform hover:scale-105 text-lg"
                  >
                    {getTranslated(hero?.ctaSecondaryText || '', (hero as any)?.translations?.ctaSecondaryText, lang)}
                  </Link>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

function ClassicFeatures({ features, t, lang }: { features: FeatureItem[] | null; t: (k: string) => string; lang: string }) {
  const { settings } = useTheme();
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features && features.length > 0 ? (
          features.map((feature, i) => (
            <div key={i} className="text-center p-6">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-main mb-2">
                {getTranslated(feature.title, (feature as any).translations?.title, lang)}
              </h3>
              <p className="text-sub text-sm">
                {getTranslated(feature.description, (feature as any).translations?.description, lang)}
              </p>
            </div>
          ))
        ) : (
          <>
            {settings.orderSettings?.deliveryEnabled && (
              <FeatureCard icon="clock" title={t('home.fastDelivery')} description={t('home.fastDeliveryDesc')} />
            )}
            {settings.navShowLocations && (
              <FeatureCard icon="clipboard" title={t('home.easyOrdering')} description={t('home.easyOrderingDesc')} />
            )}
            {settings.navShowReservations && (
              <FeatureCard icon="calendar" title={t('home.tableReservations')} description={t('home.tableReservationsDesc')} />
            )}
          </>
        )}
      </div>
    </section>
  );
}

interface CtaSection {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

function ClassicCta({ cta, t, lang }: { cta: CtaSection | null; t: (k: string) => string; lang: string }) {
  const { settings } = useTheme();
  const { user } = useAuth();

  if (user || (!settings.showMembership && (!cta?.buttonLink || cta.buttonLink === '/register'))) {
    return null;
  }

  return (
    <section className="bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold text-main mb-4">
          {getTranslated(cta?.title || '', (cta as any)?.translations?.title, lang) || t('home.readyToOrder')}
        </h2>
        <p className="text-sub mb-6">
          {getTranslated(cta?.description || '', (cta as any)?.translations?.description, lang) || t('home.readyToOrderDesc')}
        </p>
        <Link
          to={cta?.buttonLink || '/register'}
          className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          {getTranslated(cta?.buttonText || '', (cta as any)?.translations?.buttonText, lang) || t('home.createAccount')}
        </Link>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  const icons: Record<string, React.ReactNode> = {
    clock: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    clipboard: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    calendar: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <div className="text-center p-6">
      <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
        {icons[icon] || icon}
      </div>
      <h3 className="text-lg font-semibold text-main mb-2">{title}</h3>
      <p className="text-sub text-sm">{description}</p>
    </div>
  );
}
