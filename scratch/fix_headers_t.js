const fs = require('fs');
const path = require('path');

const headers = [
  'BoldHeader.tsx', 'CozyHeader.tsx', 'MinimalHeader.tsx', 'ModernHeader.tsx',
  'RetroHeader.tsx', 'RusticHeader.tsx', 'SleekHeader.tsx', 'VibrantHeader.tsx'
];

for (const name of headers) {
  const filePath = path.join(__dirname, '../packages/storefront/src/templates/headers', name);
  let text = fs.readFileSync(filePath, 'utf-8');
  const original = text;

  // Remove duplicate t declaration
  text = text.replace(/(\s*)const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);\s*/g, '');

  if (text !== original) {
    fs.writeFileSync(filePath, text);
    console.log(`Fixed ${name}`);
  }
}
