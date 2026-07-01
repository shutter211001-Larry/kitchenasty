const fs = require('fs');
const path = require('path');

const adminI18nPath = path.join('C:', 'Users', 'aeiou', '.gemini', 'antigravity-ide', 'brain', '35fcdf67-657a-4295-b569-0594cfb05dab', 'scratch', 'admin_i18n.json');
const storeI18nPath = path.join('C:', 'Users', 'aeiou', '.gemini', 'antigravity-ide', 'brain', '35fcdf67-657a-4295-b569-0594cfb05dab', 'scratch', 'store_i18n.json');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

function mergeLocales(i18nDataPath, targetDir) {
  if (!fs.existsSync(i18nDataPath)) {
    console.log(`File not found: ${i18nDataPath}`);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(i18nDataPath, 'utf8'));
  
  const langs = ['zh-TW', 'en', 'ja', 'ko', 'th', 'id', 'vi', 'tl', 'es', 'fr', 'de', 'it', 'pt'];
  
  for (const lang of langs) {
    if (data[lang]) {
      const targetFilePath = path.join(__dirname, '..', targetDir, `${lang}.json`);
      let existingData = {};
      if (fs.existsSync(targetFilePath)) {
        existingData = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
      }
      
      const merged = deepMerge(existingData, data[lang]);
      fs.writeFileSync(targetFilePath, JSON.stringify(merged, null, 2));
      console.log(`Merged ${lang} into ${targetFilePath}`);
    }
  }
}

mergeLocales(adminI18nPath, 'packages/adminfront/src/i18n/locales');
mergeLocales(storeI18nPath, 'packages/storefront/src/i18n/locales');
