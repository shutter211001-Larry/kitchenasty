import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixInterfaces(dirName, interfaceName) {
  const dirPath = path.join(__dirname, '..', 'templates', dirName);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.tsx') && f !== 'index.ts' && f !== 'useHeaderProps.ts');

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('lang?: string;')) {
      content = content.replace(
        /t: \(key: string\) => string;/,
        "t: (key: string) => string;\n  lang?: string;"
      );
    }
    
    if (dirName === 'heroes' && file === 'VibrantHero.tsx' && !content.includes('getTranslated')) {
        content = content.replace(
            "import { useTheme } from '../../context/ThemeContext.js';",
            "import { useTheme } from '../../context/ThemeContext.js';\nimport { getTranslated } from '../../utils/translation.js';"
        );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

fixInterfaces('heroes', 'HeroProps');
fixInterfaces('features', 'FeaturesProps');
fixInterfaces('ctas', 'CtaProps');

console.log('Fixed interfaces');
