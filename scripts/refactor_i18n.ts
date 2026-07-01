import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const workspaceDir = __dirname;
const adminDir = path.join(workspaceDir, '../packages/adminfront/src');
const storeDir = path.join(workspaceDir, '../packages/storefront/src');

let adminKeyCounter = 1;
let storeKeyCounter = 1;

const adminDict: Record<string, string> = {};
const storeDict: Record<string, string> = {};

function containsChinese(text: string) {
  return /[\u4e00-\u9fa5]/.test(text) && !text.includes('Shutter') && !text.includes('夏特');
}

function processFile(filePath: string, isAdmin: boolean) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!containsChinese(content)) return;

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const replacements: { start: number; end: number; text: string }[] = [];
  let needsImport = false;

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.getText();
      const rawText = text.trim();
      if (containsChinese(rawText)) {
        const key = isAdmin ? `autoGen.admin.key${adminKeyCounter++}` : `autoGen.store.key${storeKeyCounter++}`;
        if (isAdmin) adminDict[key] = rawText;
        else storeDict[key] = rawText;
        
        const startOffset = text.indexOf(rawText);
        const endOffset = startOffset + rawText.length;
        
        replacements.push({
          start: node.getStart() + startOffset,
          end: node.getStart() + endOffset,
          text: `{t('${key}')}`
        });
        needsImport = true;
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.getText();
      const rawText = text.slice(1, -1).trim();
      if (containsChinese(rawText)) {
        if (node.parent && ts.isImportDeclaration(node.parent)) return;
        
        const key = isAdmin ? `autoGen.admin.key${adminKeyCounter++}` : `autoGen.store.key${storeKeyCounter++}`;
        if (isAdmin) adminDict[key] = rawText;
        else storeDict[key] = rawText;

        if (node.parent && ts.isJsxAttribute(node.parent)) {
          replacements.push({
            start: node.getStart(),
            end: node.getEnd(),
            text: `{t('${key}')}`
          });
        } else {
          replacements.push({
            start: node.getStart(),
            end: node.getEnd(),
            text: `t('${key}')`
          });
        }
        needsImport = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (replacements.length > 0) {
    replacements.sort((a, b) => b.start - a.start);

    for (const r of replacements) {
      content = content.substring(0, r.start) + r.text + content.substring(r.end);
    }

    if (needsImport && !content.includes('useTranslation')) {
      const firstImportMatch = content.match(/import .* from .*/);
      if (firstImportMatch) {
        content = content.replace(firstImportMatch[0], `import { useTranslation } from 'react-i18next';\n${firstImportMatch[0]}`);
      } else {
        content = `import { useTranslation } from 'react-i18next';\n${content}`;
      }
    }
    
    if (needsImport && !content.includes('const { t } = useTranslation()')) {
      content = content.replace(/(export (default )?function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/, '$1\n  const { t } = useTranslation();\n');
      content = content.replace(/(const [a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)/, '$1\n  const { t } = useTranslation();\n');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkSync(dir: string, isAdmin: boolean) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      walkSync(dirFile, isAdmin);
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        try {
          processFile(dirFile, isAdmin);
        } catch (e) {
          console.error(`Error processing ${dirFile}:`, e);
        }
      }
    }
  }
}

console.log('Scanning Admin...');
walkSync(adminDir, true);

console.log('Scanning Store...');
walkSync(storeDir, false);

fs.writeFileSync(path.join(workspaceDir, 'admin_extracted.json'), JSON.stringify(adminDict, null, 2));
fs.writeFileSync(path.join(workspaceDir, 'store_extracted.json'), JSON.stringify(storeDict, null, 2));

console.log(`Extracted ${Object.keys(adminDict).length} admin keys and ${Object.keys(storeDict).length} store keys.`);
