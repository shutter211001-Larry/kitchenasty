import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.join(__dirname, 'packages/adminfront/src/i18n/locales');

const locales = [
  'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'th', 'tl', 'vi', 'id', 'zh-TW'
];

const newKeys = {
  isFranchise: "This is a franchise store",
  franchiseeName: "Franchisee Name",
  royaltyRate: "Royalty Rate (%)",
  inventory: "Store Inventory"
};

const newKeysTw = {
  isFranchise: "這是一間加盟門市",
  franchiseeName: "加盟主姓名",
  royaltyRate: "抽成比例 (%)",
  inventory: "門市庫存"
};

for (const locale of locales) {
  const filePath = path.join(localesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let data = JSON.parse(content);

  if (!data.locationForm) {
    data.locationForm = {};
  }
  
  if (locale === 'zh-TW') {
    data.locationForm.isFranchise = newKeysTw.isFranchise;
    data.locationForm.franchiseeName = newKeysTw.franchiseeName;
    data.locationForm.royaltyRate = newKeysTw.royaltyRate;
    data.locationForm.inventory = newKeysTw.inventory;
    
    content = JSON.stringify(data, null, 2);
    content = content.replace(/分店/g, '門市');
    content = content.replace(/加盟店/g, '加盟門市');
    fs.writeFileSync(filePath, content, 'utf8');
  } else {
    data.locationForm.isFranchise = newKeys.isFranchise;
    data.locationForm.franchiseeName = newKeys.franchiseeName;
    data.locationForm.royaltyRate = newKeys.royaltyRate;
    data.locationForm.inventory = newKeys.inventory;
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
  
  console.log(`Updated ${locale}.json`);
}
