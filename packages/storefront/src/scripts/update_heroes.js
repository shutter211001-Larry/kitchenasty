import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const heroesDir = path.join(__dirname, '..', 'templates', 'heroes');

const files = fs.readdirSync(heroesDir).filter(f => f.endsWith('Hero.tsx'));

for (const file of files) {
  const filePath = path.join(heroesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add import if missing
  if (!content.includes('getTranslated')) {
    content = content.replace(
      "import { useTheme } from '../../context/ThemeContext.js';",
      "import { useTheme } from '../../context/ThemeContext.js';\nimport { getTranslated } from '../../utils/translation.js';"
    );
  }

  // Update props to include lang
  content = content.replace(
    /({ hero, t }(?:: HeroProps)?)/,
    '{ hero, t, lang = \'zh-TW\' }: HeroProps'
  );

  // Replace text bindings
  content = content.replace(
    /hero\?\.title \|\| t\('home\.heroTitle'\)/g,
    "getTranslated(hero?.title || '', (hero as any)?.translations?.title, lang) || t('home.heroTitle')"
  );

  content = content.replace(
    /hero\?\.subtitle \|\| t\('home\.heroDescription'\)/g,
    "getTranslated(hero?.subtitle || '', (hero as any)?.translations?.subtitle, lang) || t('home.heroDescription')"
  );

  content = content.replace(
    /hero\?\.ctaPrimaryText \|\| t\('home\.viewMenu'\)/g,
    "getTranslated(hero?.ctaPrimaryText || '', (hero as any)?.translations?.ctaPrimaryText, lang) || t('home.viewMenu')"
  );

  content = content.replace(
    /hero\?\.ctaSecondaryText \|\| t\('home\.findLocation'\)/g,
    "getTranslated(hero?.ctaSecondaryText || '', (hero as any)?.translations?.ctaSecondaryText, lang)"
  );
  
  // Fix CTA secondary fallback text since it was returning t('home.findLocation') before
  content = content.replace(
    /getTranslated\(hero\?\.ctaSecondaryText \|\| '', \(hero as any\)\?\.translations\?\.ctaSecondaryText, lang\)/g,
    "getTranslated(hero?.ctaSecondaryText || '', (hero as any)?.translations?.ctaSecondaryText, lang) || t('home.findLocation')"
  );

  // Update reservations logic
  content = content.replace(
    /if \(link === '\/reservations' && !settings\.navShowReservations\) return null;/g,
    "if (link === '/reservations' && (!settings.navShowReservations || !settings.reservationSettings?.enabled)) return null;"
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
