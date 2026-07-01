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

export default function BoldCta({ cta, t, lang = 'zh-TW' }: CtaProps) {
  const { settings } = useTheme();
  const { user } = useAuth();
  const title = getTranslated(cta?.title || '', (cta as any)?.translations?.title, lang) || t('home.readyToOrder');
  const description = getTranslated(cta?.description || '', (cta as any)?.translations?.description, lang) || t('home.readyToOrderDesc');
  const buttonText = getTranslated(cta?.buttonText || '', (cta as any)?.translations?.buttonText, lang) || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  if (user || (!settings.showMembership && (!cta?.buttonLink || cta.buttonLink === '/register'))) {
    return null;
  }return (
    <section className="bg-gray-950 py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 uppercase">
          {title}
        </h2>
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          {description}
        </p>
        <Link
          to={buttonLink}
          className="inline-block px-10 py-4 bg-primary-600 text-white text-lg font-bold uppercase tracking-wider rounded-md hover:bg-primary-500 transition-colors"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
