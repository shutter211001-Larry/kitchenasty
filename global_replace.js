const fs = require('fs');
const path = require('path');

const directories = [
  'packages/server/src',
  'packages/server/scripts',
  'packages/server',
  'packages/storefront/src',
  'packages/storefront/scripts',
  'packages/storefront',
  'packages/admin/src',
  'packages/admin',
  'packages/shutter-erp-frontend/src',
  '.',
];

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.env.example'];

const replacements = [
  // Backend / Server URLs
  { from: /process\.env\.SERVER_URL/g, to: 'process.env.API_URL_PUBLIC' },
  { from: /process\.env\.KITCHENASTY_API_URL/g, to: 'process.env.API_URL_PUBLIC' },
  { from: /process\.env\.SHUTTER_ERP_API_URL/g, to: 'process.env.API_URL_PUBLIC' },
  { from: /process\.env\.BACKEND_URL/g, to: 'process.env.API_URL_PRIVATE' },

  // Storefront URLs
  { from: /process\.env\.STOREFRONT_URL/g, to: 'process.env.STORE_URL_PUBLIC' },

  // Vite API URLs
  { from: /process\.env\.VITE_API_URL/g, to: 'process.env.VITE_API_URL_PUBLIC' },
  { from: /import\.meta\.env\.VITE_API_URL/g, to: 'import.meta.env.VITE_API_URL_PUBLIC' },
  { from: /import\.meta\.env\.VITE_STOREFRONT_URL/g, to: 'import.meta.env.VITE_STORE_URL_PUBLIC' },

  // .env exact variable replacements (using anchors to avoid partial replacements)
  { from: /^SERVER_URL=/gm, to: 'API_URL_PUBLIC=' },
  { from: /^KITCHENASTY_API_URL=/gm, to: 'API_URL_PUBLIC=' },
  { from: /^SHUTTER_ERP_API_URL=/gm, to: 'API_URL_PUBLIC=' },
  { from: /^BACKEND_URL=/gm, to: 'API_URL_PRIVATE=' },
  { from: /^STOREFRONT_URL=/gm, to: 'STORE_URL_PUBLIC=' },
  { from: /^VITE_API_URL=/gm, to: 'VITE_API_URL_PUBLIC=' },
  
  // Clean up any double PUBLIC_PUBLIC due to repeated runs
  { from: /API_URL_PUBLIC/g, to: 'API_URL_PUBLIC' },
  { from: /STORE_URL_PUBLIC/g, to: 'STORE_URL_PUBLIC' },
  { from: /VITE_API_URL_PUBLIC/g, to: 'VITE_API_URL_PUBLIC' },
];

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        processDirectory(fullPath);
      }
    } else {
      const ext = path.extname(fullPath);
      if (extensions.includes(ext) || file === '.env' || file === '.env.example') {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        replacements.forEach(rep => {
          if (rep.from.test(content)) {
            content = content.replace(rep.from, rep.to);
            modified = true;
          }
        });

        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Modified: ${fullPath}`);
        }
      }
    }
  });
}

directories.forEach(dir => {
  processDirectory(path.resolve(__dirname, dir));
});
console.log('Done replacing environment variables.');
