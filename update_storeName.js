const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'packages/storefront/src/i18n/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('Shutter')) {
    content = content.replace(/Shutter/g, '{{storeName}}');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
