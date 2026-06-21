import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { getTranslated } from '../../utils/translation.js';

interface CtaProps {
  cta: { title?: string; description?: string; buttonText?: string; buttonLink?: string } | null;
  t: (key: string) => string;
  lang?: string;
}

export default function SleekCta({ cta, t, lang = 'zh-TW' }: CtaProps) {
  const { settings } = useTheme();
  const { user } = useAuth();
  const title = getTranslated(cta?.title || '', (cta as any)?.translations?.title, lang) || t('home.readyToOrder');
  const description = getTranslated(cta?.description || '', (cta as any)?.translations?.description, lang) || t('home.readyToOrderDesc');
  const buttonText = getTranslated(cta?.buttonText || '', (cta as any)?.translations?.buttonText, lang) || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  if (user || (!settings.showMembership && (!cta?.buttonLink || cta.buttonLink === '/register'))) {
    return null;
  }

  return (
    <section className="py-24 bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-5">
          {title}
        </h2>
        <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto">
          {description}
        </p>
        <Link
          to={buttonLink}
          className="inline-block px-10 py-4 bg-primary-600 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(var(--color-primary-500),0.4)] hover:shadow-[0_0_30px_rgba(var(--color-primary-500),0.6)] hover:bg-primary-500 transition-all duration-300"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
