const fs = require('fs');
const path = require('path');

const locales = ['de.json', 'en.json', 'es.json', 'fr.json', 'id.json', 'it.json', 'ja.json', 'ko.json', 'pt.json', 'th.json', 'tl.json', 'vi.json', 'zh-TW.json'];

// Adminfront Translations
const adminfrontDir = path.join(__dirname, '../packages/adminfront/src/i18n/locales');
const adminKeys = {
  typeFrozenDelivery: {
    'zh-TW.json': '冷凍宅配 (Frozen)',
    'en.json': 'Frozen Delivery',
    'ja.json': '冷凍便',
    'ko.json': '냉동 배송'
  },
  frozenDelivery: {
    'zh-TW.json': '冷凍宅配',
    'en.json': 'Frozen Delivery',
    'ja.json': '冷凍便',
    'ko.json': '냉동 배송'
  }
};

for (const locale of locales) {
  const filePath = path.join(adminfrontDir, locale);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.orderList) data.orderList = {};
    
    data.orderList.typeFrozenDelivery = adminKeys.typeFrozenDelivery[locale] || adminKeys.typeFrozenDelivery['en.json'];
    data.orderList.frozenDelivery = adminKeys.frozenDelivery[locale] || adminKeys.frozenDelivery['en.json'];
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }
}

console.log('Adminfront orderList translations synced!');
