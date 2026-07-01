import fs from 'fs';
import path from 'path';

const workspaceDir = __dirname;
const adminDir = path.join(workspaceDir, '../packages/adminfront/src');
const storeDir = path.join(workspaceDir, '../packages/storefront/src');

function fixFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Remove duplicate `const { t } = useTranslation();`
  // We can just keep the first one and remove all subsequent ones in the same block/scope, 
  // or more safely: if it appears twice, remove the second one.
  // Wait, some files might have multiple components.
  // Actually, standard `Duplicate identifier 't'` means it was injected in the same scope.
  const tDeclRegex = /const \{ t \} = useTranslation\(\);/g;
  const matches = [...content.matchAll(tDeclRegex)];
  
  if (matches.length > 1) {
    // There are multiple declarations. Let's see if they are in the same block.
    // If they are literally right next to each other, remove one.
    content = content.replace(/const \{ t \} = useTranslation\(\);\s*const \{ t \} = useTranslation\(\);/g, 'const { t } = useTranslation();');
    changed = true;
  }

  // If a file has t('...') but no const { t } = useTranslation();
  // We need to inject it right inside the component body.
  const hasTUsage = /\bt\('/.test(content) || /\{t\('/.test(content);
  const hasTDecl = /const \{ t \}/.test(content);

  if (hasTUsage && !hasTDecl) {
    // Find component start.
    // We can look for `return (` or `return <` and inject it before the return.
    // Or look for `=> {` or `) {` after function/const declarations.
    // For observer(() => { ... })
    content = content.replace(/(observer\(\([^)]*\)\s*=>\s*\{)/, '$1\n  const { t } = useTranslation();\n');
    content = content.replace(/(export (const|let) [a-zA-Z0-9_]+\s*=\s*observer\(\([^)]*\)\s*=>\s*\{)/, '$1\n  const { t } = useTranslation();\n');
    
    // Catch-all: inject just before `return (` if not injected yet
    if (!/const \{ t \} = useTranslation\(\);/.test(content)) {
      content = content.replace(/(\s+)(return\s+[<\(])/g, '$1const { t } = useTranslation();$1$2');
    }
    
    changed = true;
  }

  // Ensure import exists if we use useTranslation
  if (content.includes('useTranslation') && !content.includes(`from 'react-i18next'`)) {
    content = `import { useTranslation } from 'react-i18next';\n` + content;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
}

function walkSync(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      walkSync(dirFile);
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        fixFile(dirFile);
      }
    }
  }
}

walkSync(adminDir);
walkSync(storeDir);
console.log('Fixes applied.');
