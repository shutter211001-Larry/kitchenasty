const fs = require('fs');
const path = require('path');

const filesToFix = [
  'AdminChatWidget.tsx',
  'ImageCropperModal.tsx',
  'CategoryForm.tsx',
  'CouponForm.tsx',
  'CustomerLoyalty.tsx',
  'DeveloperMetrics.tsx',
  'LocationForm.tsx',
  'MenuItemForm.tsx',
  'MenuItemList.tsx',
  'OrderCreate.tsx',
  'SettingsFranchise.tsx',
  'SettingsPermissions.tsx',
  'TableList.tsx'
];

for (const fileName of filesToFix) {
  let filePath = path.join(__dirname, '../packages/adminfront/src/components', fileName);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '../packages/adminfront/src/pages', fileName);
  }
  if (!fs.existsSync(filePath)) {
    console.log(`Not found: ${fileName}`);
    continue;
  }

  let text = fs.readFileSync(filePath, 'utf-8');
  const originalText = text;

  // Add import if missing
  if (!text.includes("import { useTranslation }")) {
    text = `import { useTranslation } from 'react-i18next';\n` + text;
  }

  // Inject const { t } into React components (starts with Uppercase)
  const regex = /(export\s+(?:default\s+)?function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{|const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)/g;
  
  text = text.replace(regex, (match) => {
    // To avoid duplicating, check if the component already has it in its first few lines
    // This is simple: just inject it if we haven't already. If we get duplicate const { t }, we will remove the old one later or let the compiler complain.
    return match + `\n  const { t } = useTranslation();\n`;
  });

  // If we ended up with multiple `const { t } = useTranslation();` in the same scope, we can clean it up by replacing 2 or more with 1.
  // Actually, we can just remove all existing `const { t } = useTranslation();` and then apply our regex.
  let cleanText = originalText.replace(/const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);\s*/g, '');
  if (!cleanText.includes("import { useTranslation }")) {
    cleanText = `import { useTranslation } from 'react-i18next';\n` + cleanText;
  }
  
  let finalText = cleanText.replace(regex, (match) => {
    return match + `\n  const { t } = useTranslation();`;
  });

  if (finalText !== originalText) {
    fs.writeFileSync(filePath, finalText);
    console.log(`Fixed ${fileName}`);
  }
}
