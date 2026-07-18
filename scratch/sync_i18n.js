import fs from 'fs';
import path from 'path';

const localesDir = 'c:/Github/kitchenasty/packages/adminfront/src/i18n/locales';
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: node sync_i18n.js <dotted.key> <zh-TW text> <en/default text>");
  process.exit(1);
}

const keyPath = args[0];
const zhText = args[1];
const defaultText = args[2];

function setNested(obj, pathArr, value) {
  let current = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    if (!current[pathArr[i]]) current[pathArr[i]] = {};
    current = current[pathArr[i]];
  }
  current[pathArr[pathArr.length - 1]] = value;
}

for (const file of files) {
  const filePath = path.join(localesDir, file);
  const lang = file.replace('.json', '');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const textToUse = lang === 'zh-TW' ? zhText : defaultText;
  
  setNested(data, keyPath.split('.'), textToUse);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${file} with ${keyPath} = ${textToUse}`);
}
