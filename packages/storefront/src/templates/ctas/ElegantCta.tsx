import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { getTranslated } from '../../utils/translation.js';

interface CtaProps {
  cta: { title?: string; description?: string; buttonText?: string; buttonLink?: string } | null;
  t: (key: string) => string;
  lang?: string;
}

export default function ElegantCta({ cta, t, lang = 'zh-TW' }: CtaProps) {
  const { settings } = useTheme();
  const { user } = useAuth();
  const title = getTranslated(cta?.title || '', (cta as any)?.translations?.title, lang) || t('home.readyToOrder');
  const description = getTranslated(cta?.description || '', (cta as any)?.translations?.description, lang) || t('home.readyToOrderDesc');
  const buttonText = getTranslated(cta?.buttonText || '', (cta as any)?.translations?.buttonText, lang) || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  if (user || (!settings.showMembership && (!cta?.buttonLink || cta.buttonLink === '/register'))) {
    return null;
  }return (
    <section className="py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="w-16 h-px bg-primary-400 mx-auto mb-8" />
        <h2 className="text-3xl md:text-4xl font-light tracking-wide text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 font-light leading-relaxed mb-10 max-w-xl mx-auto">
          {description}
        </p>
        <Link
          to={buttonLink}
          className="inline-block px-8 py-3 text-sm font-medium uppercase tracking-widest border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white transition-all duration-300 rounded-sm"
        >
          {buttonText}
        </Link>
        <div className="w-16 h-px bg-primary-400 mx-auto mt-8" />
      </div>
    </section>
  );
}
