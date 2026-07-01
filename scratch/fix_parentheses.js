const fs = require('fs');
const path = require('path');

const apps = ['adminfront', 'storefront'];
const workspace = path.join(__dirname, '..');

function walkSync(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
}

let modifiedCount = 0;

apps.forEach(app => {
  const srcDir = path.join(workspace, 'packages', app, 'src');
  const files = walkSync(srcDir);
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Replace t('something')) with t('something')
    // and t("something")) with t("something")
    // Wait, it might be t('something'))), so we should use a replace loop or a regex that replaces t('...') followed by multiple ))?
    // The previous script added exactly ONE extra closing parenthesis because it replaced `t('key'` with `t('newKey')`. 
    // The original was `t('key')`. It became `t('newKey'))`.
    // So we just need to replace `t('([^']+)')\)` with `t('$1')`.
    
    const regex = /t\(['"]([a-zA-Z0-9_\.]+)['"]\)\)/g;
    
    if (regex.test(content)) {
      const newContent = content.replace(regex, "t('$1')");
      fs.writeFileSync(file, newContent, 'utf8');
      modifiedCount++;
    }
  });
});

console.log(`Fixed extra parentheses in ${modifiedCount} files.`);
