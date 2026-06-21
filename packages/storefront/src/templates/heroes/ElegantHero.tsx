import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.js';
import { getTranslated } from '../../utils/translation.js';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string } | null;
  t: (key: string) => string;
  lang?: string;
}

export default function ElegantHero({ hero, t, lang = 'zh-TW' }: HeroProps) {
  const { settings } = useTheme();
  const bgStyle = hero?.backgroundImage
    ? { backgroundImage: `url(${hero.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <section
      className="relative min-h-[70vh] flex items-center justify-center bg-gray-900"
      style={bgStyle}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Decorative top/bottom borders */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Small decorative element */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="block w-12 h-px bg-amber-300/70" />
          <span className="text-amber-300 text-xs tracking-[0.3em] uppercase font-light">Welcome</span>
          <span className="block w-12 h-px bg-amber-300/70" />
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {getTranslated(hero?.title || '', (hero as any)?.translations?.title, lang) || t('home.heroTitle')}
        </h1>

        <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto font-light leading-relaxed">
          {getTranslated(hero?.subtitle || '', (hero as any)?.translations?.subtitle, lang) || t('home.heroDescription')}
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {settings.navShowMenu && (
            <Link
              to={hero?.ctaPrimaryLink || '/menu'}
              className="border border-amber-300 text-amber-100 px-8 py-3 text-sm tracking-widest uppercase hover:bg-amber-300 hover:text-gray-900 transition-all duration-300"
            >
              {getTranslated(hero?.ctaPrimaryText || '', (hero as any)?.translations?.ctaPrimaryText, lang) || t('home.viewMenu')}
            </Link>
          )}
          {(() => {
            const link = hero?.ctaSecondaryLink || '/locations';
            if (link === '/locations' && !settings.navShowLocations) return null;
            if (link === '/reservations' && (!settings.navShowReservations || !settings.reservationSettings?.enabled)) return null;
            return (
              <Link
                to={link}
                className="border border-white/30 text-white/80 px-8 py-3 text-sm tracking-widest uppercase hover:border-white hover:text-white transition-all duration-300"
              >
                {getTranslated(hero?.ctaSecondaryText || '', (hero as any)?.translations?.ctaSecondaryText, lang) || t('home.findLocation')}
              </Link>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
