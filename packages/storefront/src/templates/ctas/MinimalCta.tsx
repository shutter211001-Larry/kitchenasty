import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.js';
import { getTranslated } from '../../utils/translation.js';

interface CtaProps {
  cta: { title?: string; description?: string; buttonText?: string; buttonLink?: string } | null;
  t: (key: string) => string;
  lang?: string;
}

export default function MinimalCta({ cta, t, lang = 'zh-TW' }: CtaProps) {
  const { settings } = useTheme();
  const title = getTranslated(cta?.title || '', (cta as any)?.translations?.title, lang) || t('home.readyToOrder');
  const description = getTranslated(cta?.description || '', (cta as any)?.translations?.description, lang) || t('home.readyToOrderDesc');
  const buttonText = getTranslated(cta?.buttonText || '', (cta as any)?.translations?.buttonText, lang) || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  if (!settings.showMembership && buttonLink === '/register') {
    return null;
  }

  return (
    <section className="py-20">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-normal text-gray-900 dark:text-white mb-3">
          {title}
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-8">
          {description}
        </p>
        <Link
          to={buttonLink}
          className="text-primary-600 dark:text-primary-400 font-medium underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
