const fs = require('fs');
const path = require('path');

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(flattenKeys(obj[key], `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

function findTCalls(dir) {
  let tCalls = new Set();
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findTCalls(fullPath).forEach(k => tCalls.add(k));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /t\(['"`](.*?)['"`]\)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        tCalls.add(match[1]);
      }
    }
  }
  return tCalls;
}

function checkMissing(projectDir) {
  console.log(`\nChecking project: ${projectDir}`);
  const localesPath = path.join(projectDir, 'src', 'i18n', 'locales', 'zh-TW.json');
  if (!fs.existsSync(localesPath)) {
    console.log(`No translation file found at ${localesPath}`);
    return;
  }
  
  const translations = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
  const definedKeys = new Set(flattenKeys(translations));
  
  const srcDir = path.join(projectDir, 'src');
  const usedKeys = findTCalls(srcDir);
  
  const missing = [];
  for (const key of usedKeys) {
    if (!definedKeys.has(key)) {
      missing.push(key);
    }
  }
  
  if (missing.length === 0) {
    console.log('No missing keys!');
  } else {
    console.log(`Found ${missing.length} missing keys:`);
    missing.forEach(k => console.log(`- ${k}`));
  }
}

checkMissing(path.join(__dirname, 'packages', 'storefront'));
checkMissing(path.join(__dirname, 'packages', 'admin'));
