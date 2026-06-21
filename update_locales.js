const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'packages/storefront/src/i18n/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const baseTranslations = {
  "groupOrder": {
    "error4Digits": "Please enter a 4-digit code",
    "errorInvalidCode": "Invalid code or group order ended",
    "errorStartFailed": "Failed to start group order",
    "groupOrderCode": "Group Order Code",
    "leaveGroupOrder": "Leave Group Order",
    "confirmLeaveGroup": "Are you sure you want to leave the current group order? Your cart will be separated.",
    "generateGroupCode": "Generate Group Code",
    "enter4DigitCode": "Enter 4-digit code",
    "join": "Join",
    "orEnterCodeToJoin": "Or enter code to join",
    "enterCodeToJoinTogether": "Enter code to order together"
  }
};

const zhTranslations = {
  "groupOrder": {
    "error4Digits": "請輸入 4 碼代碼",
    "errorInvalidCode": "代碼無效或同桌點餐已結束",
    "errorStartFailed": "發起訂單失敗",
    "groupOrderCode": "同桌點餐代碼",
    "leaveGroupOrder": "退出同桌",
    "confirmLeaveGroup": "確定要退出目前的同桌點餐嗎？您的購物車將與同桌分開。",
    "generateGroupCode": "產生同桌代碼",
    "enter4DigitCode": "輸入4碼",
    "join": "加入",
    "orEnterCodeToJoin": "或輸入代碼加入訂單",
    "enterCodeToJoinTogether": "輸入代碼一起點餐"
  }
};

for (const file of files) {
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.groupOrder) {
    if (file === 'zh-TW.json' || file === 'zh-CN.json') {
      data.groupOrder = zhTranslations.groupOrder;
    } else {
      data.groupOrder = baseTranslations.groupOrder;
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated ${file}`);
  }
}
