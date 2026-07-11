const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'packages/adminfront/src/i18n/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.orderCreate) data.orderCreate = {};
  data.orderCreate.estimatedWaitTime = "Estimated Wait Time";
  data.orderCreate.minutes = "mins";
  data.orderCreate.expectedReadyTime = "Expected Ready";

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('Patched all locales with new keys!');
