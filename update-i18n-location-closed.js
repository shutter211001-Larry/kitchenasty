const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'packages/adminfront/src/i18n/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const translations = {
  'en.json': 'Closed',
  'zh-TW.json': '休息',
  'ja.json': '休業',
  'ko.json': '휴무',
  'es.json': 'Cerrado',
  'fr.json': 'Fermé',
  'de.json': 'Geschlossen',
  'it.json': 'Chiuso',
  'pt.json': 'Fechado',
  'th.json': 'ปิด',
  'tl.json': 'Sarado',
  'vi.json': 'Đóng cửa',
  'id.json': 'Tutup'
};

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.locationForm) {
    data.locationForm = {};
  }
  
  // Rule 1: No language prefixes for translations
  const text = translations[file] || 'Closed';
  data.locationForm.closed = text;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${file}`);
});
