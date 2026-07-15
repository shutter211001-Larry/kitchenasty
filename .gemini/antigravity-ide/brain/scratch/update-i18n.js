import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(process.cwd(), 'packages', 'adminfront', 'src', 'i18n', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const translations = {
  'en': 'Marketing Dashboard',
  'zh-TW': '行銷儀表板',
  'es': 'Panel de Marketing',
  'fr': 'Tableau de Bord Marketing',
  'de': 'Marketing-Dashboard',
  'it': 'Dashboard Marketing',
  'ja': 'マーケティングダッシュボード',
  'ko': '마케팅 대시보드',
  'pt': 'Painel de Marketing',
  'th': 'แดชบอร์ดการตลาด',
  'tl': 'Marketing Dashboard',
  'vi': 'Bảng Điều Khiển Tiếp Thị',
  'id': 'Dasbor Pemasaran',
};

files.forEach(file => {
  const lang = file.replace('.json', '');
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  if (!data.nav) data.nav = {};
  data.nav.marketingDashboard = translations[lang] || translations['en'];
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${file}`);
});
