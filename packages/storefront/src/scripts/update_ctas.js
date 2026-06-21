import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ctasDir = path.join(__dirname, '..', 'templates', 'ctas');
const files = fs.readdirSync(ctasDir).filter(f => f.endsWith('Cta.tsx'));

for (const file of files) {
  const filePath = path.join(ctasDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add getTranslated and useAuth imports
  if (!content.includes('getTranslated')) {
    content = content.replace(
      "import { useTheme } from '../../context/ThemeContext.js';",
      "import { useTheme } from '../../context/ThemeContext.js';\nimport { useAuth } from '../../context/AuthContext.js';\nimport { getTranslated } from '../../utils/translation.js';"
    );
  } else if (!content.includes('useAuth')) {
      content = content.replace(
      "import { useTheme } from '../../context/ThemeContext.js';",
      "import { useTheme } from '../../context/ThemeContext.js';\nimport { useAuth } from '../../context/AuthContext.js';"
    );
  }

  content = content.replace(
    /({ cta, t }(?:: CtaProps)?)/,
    '{ cta, t, lang = \'zh-TW\' }: CtaProps'
  );

  if (!content.includes('const { user } = useAuth();')) {
      content = content.replace(
        "const { settings } = useTheme();",
        "const { settings } = useTheme();\n  const { user } = useAuth();"
      );
  }

  // Update return null logic
  content = content.replace(
    /if \(!settings\.showMembership && buttonLink === '\/register'\) \{\s*return null;\s*\}/,
    `if (user || (!settings.showMembership && (!cta?.buttonLink || cta.buttonLink === '/register'))) {
    return null;
  }`
  );

  // Update translated variables
  content = content.replace(
    /const title = cta\?\.title \|\| t\('home\.readyToOrder'\);/,
    "const title = getTranslated(cta?.title || '', (cta as any)?.translations?.title, lang) || t('home.readyToOrder');"
  );
  content = content.replace(
    /const description = cta\?\.description \|\| t\('home\.readyToOrderDesc'\);/,
    "const description = getTranslated(cta?.description || '', (cta as any)?.translations?.description, lang) || t('home.readyToOrderDesc');"
  );
  content = content.replace(
    /const buttonText = cta\?\.buttonText \|\| t\('home\.createAccount'\);/,
    "const buttonText = getTranslated(cta?.buttonText || '', (cta as any)?.translations?.buttonText, lang) || t('home.createAccount');"
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}

// Update index.ts Props
const indexPath = path.join(ctasDir, 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes('lang?: string')) {
  indexContent = indexContent.replace(
    /t: \(key: string\) => string;/,
    "t: (key: string) => string;\n  lang?: string;"
  );
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('Updated index.ts');
}
