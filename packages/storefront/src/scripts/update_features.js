import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const featuresDir = path.join(__dirname, '..', 'templates', 'features');
const files = fs.readdirSync(featuresDir).filter(f => f.endsWith('Features.tsx'));

const filterLogic = `features.filter(f => {
              if (!settings.navShowLocations && (f.title.includes('分店') || f.title.includes('定位') || f.title.includes('預約'))) return false;
              if ((!settings.navShowReservations || !settings.reservationSettings?.enabled) && f.title.includes('預約')) return false;
              return true;
            })`;

for (const file of files) {
  const filePath = path.join(featuresDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('getTranslated')) {
    content = content.replace(
      "import { useTheme } from '../../context/ThemeContext.js';",
      "import { useTheme } from '../../context/ThemeContext.js';\nimport { getTranslated } from '../../utils/translation.js';"
    );
  }

  content = content.replace(
    /({ features, t }(?:: FeaturesProps)?)/,
    '{ features, t, lang = \'zh-TW\' }: FeaturesProps'
  );

  // Replace default items generation and filtering
  content = content.replace(
    /const items = features\?\.length \? features : \[\s*(.*?)\s*\]\.filter\(Boolean\) as Array<\{ icon: string; title: string; description: string \}>;/s,
    `const items = features?.length ? ${filterLogic} : [
    settings.orderSettings?.deliveryEnabled && { icon: 'clock', title: t('home.fastDelivery'), description: t('home.fastDeliveryDesc') },
    settings.navShowLocations && { icon: 'clipboard', title: t('home.easyOrdering'), description: t('home.easyOrderingDesc') },
    settings.navShowReservations && settings.reservationSettings?.enabled && { icon: 'calendar', title: t('home.tableReservations'), description: t('home.tableReservationsDesc') },
  ].filter(Boolean) as Array<{ icon: string; title: string; description: string }>;`
  );

  // Replace feature.title
  content = content.replace(
    />\s*\{feature\.title\}\s*</g,
    ">{getTranslated(feature.title, (feature as any).translations?.title, lang)}<"
  );

  // Replace feature.description
  content = content.replace(
    />\s*\{feature\.description\}\s*</g,
    ">{getTranslated(feature.description, (feature as any).translations?.description, lang)}<"
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}

// Update index.ts Props
const indexPath = path.join(featuresDir, 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes('lang?: string')) {
  indexContent = indexContent.replace(
    /t: \(key: string\) => string;/,
    "t: (key: string) => string;\n  lang?: string;"
  );
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('Updated index.ts');
}
