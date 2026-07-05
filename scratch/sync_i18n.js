const fs = require('fs');
const path = require('path');

const packages = ['adminfront', 'storefront', 'erpfront', 'kitchenfront', 'posfront'];
const localesList = ['de.json', 'en.json', 'es.json', 'fr.json', 'id.json', 'it.json', 'ja.json', 'ko.json', 'pt.json', 'th.json', 'tl.json', 'vi.json', 'zh-TW.json'];

function syncObject(base, enBase, target) {
  const result = {};
  for (const key of Object.keys(base)) {
    if (typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
      result[key] = syncObject(
        base[key], 
        (enBase && enBase[key]) || {}, 
        (target && target[key]) || {}
      );
    } else {
      if (target && target[key] !== undefined && target[key] !== '') {
        result[key] = target[key];
      } else if (enBase && enBase[key] !== undefined && enBase[key] !== '') {
        result[key] = enBase[key];
      } else {
        result[key] = base[key];
      }
    }
  }
  return result;
}

for (const pkg of packages) {
  const localesDir = path.join(__dirname, '../packages', pkg, 'src/i18n/locales');
  if (!fs.existsSync(localesDir)) continue;
  
  console.log(`Syncing i18n for ${pkg}...`);
  const zhPath = path.join(localesDir, 'zh-TW.json');
  if (!fs.existsSync(zhPath)) continue;
  
  const base = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  const enPath = path.join(localesDir, 'en.json');
  const enBase = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {};

  // First ensure en.json has all keys
  const newEn = syncObject(base, base, enBase);
  fs.writeFileSync(enPath, JSON.stringify(newEn, null, 2) + '\n');
  
  for (const loc of localesList) {
    if (loc === 'zh-TW.json' || loc === 'en.json') continue;
    const targetPath = path.join(localesDir, loc);
    const target = fs.existsSync(targetPath) ? JSON.parse(fs.readFileSync(targetPath, 'utf8')) : {};
    
    const newTarget = syncObject(base, newEn, target);
    fs.writeFileSync(targetPath, JSON.stringify(newTarget, null, 2) + '\n');
  }
}

console.log('All 13 languages synced successfully!');
