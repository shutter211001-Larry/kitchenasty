const fs = require('fs');

const storefrontPath = 'packages/storefront/src/i18n/locales/zh-TW.json';
const adminPath = 'packages/admin/src/i18n/locales/zh-TW.json';

function addKeys(filePath, newKeys) {
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const [k, v] of Object.entries(newKeys)) {
      const parts = k.split('.');
      let current = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      if (current[parts[parts.length - 1]] === undefined) {
        current[parts[parts.length - 1]] = v;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

addKeys(storefrontPath, {
  'checkout.roundingAdjustment': '結算調整 (Rounding)',
  'checkout.loyaltyTitle': '會員紅利',
  'checkout.loyaltyPointsToRedeem': '欲折抵點數',
  'checkout.cashOnDeliverySub': '現場以現金或實體卡片付款',
  'checkout.orderNotes': '訂單備註',
  'orders.roundingAdjustment': '結算調整 (Rounding)',
  'orders.errorLoadingDesc': '載入訂單時發生錯誤',
  'common.success': '成功',
  'recent_orders_updated': '最新訂單已更新'
});

addKeys(adminPath, {
  'orders.roundingAdjustment': '結算調整 (Rounding)',
  'orders.backToOrders': '返回訂單列表',
  'orders.items': '訂單品項',
  'orders.free': '免費',
  'orders.orderDetail': '訂單詳情',
  'checkout.orderNotes': '訂單備註',
  'checkout.roundingAdjustment': '結算調整 (Rounding)',
  'reservations.location': '分店位置',
  'common.noResults': '沒有找到結果',
  'common.none': '無'
});
