const fs = require('fs');
const path = require('path');

const localesDirs = [
  path.join(__dirname, '../packages/adminfront/src/i18n/locales'),
  path.join(__dirname, '../packages/storefront/src/i18n/locales')
];

function unflatten(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

// Function to collect all autoGen values and delete old structures
function collectAndCleanAutoGen(obj, collection) {
  for (const key in obj) {
    if (key.startsWith('autoGen.')) {
      collection[key] = obj[key];
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      collectAndCleanAutoGen(obj[key], collection);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    }
  }
}

for (const dir of localesDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 1. Collect all flat autoGen.xxx keys
    const autoGenKeys = {};
    if (data.autoGen) {
       collectAndCleanAutoGen(data.autoGen, autoGenKeys);
    }
    
    // Also check root just in case
    collectAndCleanAutoGen(data, autoGenKeys);
    
    // If there were any, unflatten them and merge them back
    if (Object.keys(autoGenKeys).length > 0) {
      const unflattened = unflatten(autoGenKeys);
      // We only care about the autoGen part
      if (unflattened.autoGen) {
        data.autoGen = data.autoGen || {};
        // deep merge the unflattened autoGen object
        for (const [k, v] of Object.entries(unflattened.autoGen)) {
          data.autoGen[k] = v;
        }
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`Fixed nesting for ${filePath}`);
    }
  }
}
