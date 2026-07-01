const fs = require('fs');
const path = require('path');

// 1. Fix i18n/index.ts
const i18nPath = path.join(__dirname, '../packages/storefront/src/i18n/index.ts');
let i18nText = fs.readFileSync(i18nPath, 'utf-8');
i18nText = i18nText.replace(/t\('autoGen\.store\.key15'\)/g, "'繁體中文'");
i18nText = i18nText.replace(/t\('autoGen\.store\.key16'\)/g, "'日本語'");
fs.writeFileSync(i18nPath, i18nText);
console.log('Fixed i18n/index.ts');

const filesWithErrors = [
  'CartDrawer.tsx', 'CookieBanner.tsx', 'MenuItemModal.tsx',
  'Home.tsx', 'Menu.tsx', 'OrderStatus.tsx',
  'ctas/BoldCta.tsx', 'ctas/CozyCta.tsx', 'ctas/ElegantCta.tsx', 'ctas/MinimalCta.tsx', 'ctas/ModernCta.tsx', 'ctas/RetroCta.tsx', 'ctas/RusticCta.tsx', 'ctas/SleekCta.tsx', 'ctas/VibrantCta.tsx',
  'features/BoldFeatures.tsx', 'features/CozyFeatures.tsx', 'features/ElegantFeatures.tsx', 'features/MinimalFeatures.tsx', 'features/ModernFeatures.tsx', 'features/RetroFeatures.tsx', 'features/RusticFeatures.tsx', 'features/SleekFeatures.tsx', 'features/VibrantFeatures.tsx',
  'headers/BoldHeader.tsx', 'headers/CozyHeader.tsx', 'headers/MinimalHeader.tsx', 'headers/ModernHeader.tsx', 'headers/RetroHeader.tsx', 'headers/RusticHeader.tsx', 'headers/SleekHeader.tsx', 'headers/VibrantHeader.tsx',
  'heroes/MinimalHero.tsx'
];

for (const name of filesWithErrors) {
  let filePath = path.join(__dirname, '../packages/storefront/src/components', name);
  if (!fs.existsSync(filePath)) filePath = path.join(__dirname, '../packages/storefront/src/pages', name);
  if (!fs.existsSync(filePath)) filePath = path.join(__dirname, '../packages/storefront/src/templates', name);
  
  if (!fs.existsSync(filePath)) {
    console.log('Not found:', name);
    continue;
  }

  let text = fs.readFileSync(filePath, 'utf-8');
  let original = text;

  // If `t` is a prop, remove ALL `const { t } = useTranslation();`
  if (text.includes('t: (key: string) => string') || text.includes('t: any') || text.match(/\{\s*cta,\s*t,\s*lang/)) {
    text = text.replace(/(\s*)const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);\s*/g, '');
  } else {
    // If it has `const { t, i18n }`, remove all `const { t } = useTranslation();`
    if (text.includes('const { t, i18n }')) {
      text = text.replace(/(\s*)const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);\s*/g, '');
    } else {
      // It just has multiple `const { t } = useTranslation();`
      // Replace all with empty, then add ONE back using our regex.
      text = text.replace(/(\s*)const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);\s*/g, '');
      const regex = /(export\s+(?:default\s+)?function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{|const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)/g;
      text = text.replace(regex, (match) => match + `\n  const { t } = useTranslation();`);
    }
  }

  if (text !== original) {
    fs.writeFileSync(filePath, text);
    console.log(`Fixed ${name}`);
  }
}
