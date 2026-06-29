const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const glob = require('glob');

const SRC_DIR = path.join(__dirname, 'packages/erpfront/src');
const LOCALE_FILE = path.join(SRC_DIR, 'i18n/locales/zh-TW.json');

// Read existing translations
let dictionary = {};
if (fs.existsSync(LOCALE_FILE)) {
  try {
    dictionary = JSON.parse(fs.readFileSync(LOCALE_FILE, 'utf8'));
  } catch (e) {}
}

const isChinese = (str) => /[\u4e00-\u9fa5]/.test(str);

let keyCounter = Object.keys(dictionary).length + 1;
const getTranslationKey = (text) => {
  // Find if text already exists
  for (const [k, v] of Object.entries(dictionary)) {
    if (v === text) return k;
  }
  const newKey = `erp_${keyCounter++}`;
  dictionary[newKey] = text;
  return newKey;
};

// Find all TSX files
const files = [];
function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
}
walk(SRC_DIR);

let processedFiles = 0;

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  if (!isChinese(code)) continue;

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });

    let needsTranslationImport = false;
    let needsI18nImport = false;

    // Track which functions we've injected useTranslation into
    const injectedFunctions = new Set();

    traverse(ast, {
      StringLiteral(path) {
        if (!isChinese(path.node.value)) return;
        
        // Skip import declarations
        if (path.findParent(p => p.isImportDeclaration())) return;

        const text = path.node.value.trim();
        if (!text) return;

        const key = getTranslationKey(text);
        
        // Find enclosing function to inject useTranslation
        const fnPath = path.findParent(p => p.isFunctionDeclaration() || p.isArrowFunctionExpression() || p.isFunctionExpression());
        
        if (fnPath && (fnPath.parentPath.isVariableDeclarator() || fnPath.isFunctionDeclaration() || fnPath.parentPath.isExportDefaultDeclaration() || fnPath.parentPath.isJSXExpressionContainer())) {
          // It's likely a React component or hook.
          needsTranslationImport = true;
          
          if (!injectedFunctions.has(fnPath.node)) {
            injectedFunctions.add(fnPath.node);
            
            // Check if it already has useTranslation
            let hasUseTranslation = false;
            if (fnPath.node.body.type === 'BlockStatement') {
              for (const stmt of fnPath.node.body.body) {
                if (stmt.type === 'VariableDeclaration') {
                  for (const decl of stmt.declarations) {
                    if (decl.init && decl.init.type === 'CallExpression' && decl.init.callee.name === 'useTranslation') {
                      hasUseTranslation = true;
                    }
                  }
                }
              }
              if (!hasUseTranslation) {
                const hookAST = parser.parse('const { t } = useTranslation();', { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body[0];
                fnPath.node.body.body.unshift(hookAST);
              }
            }
          }

          // Replace the string literal with t('key')
          if (path.parentPath.isJSXAttribute()) {
            path.replaceWith(t.jsxExpressionContainer(
              t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
            ));
          } else if (path.parentPath.isObjectProperty() && path.parentPath.node.key === path.node) {
             // It's an object key, don't translate keys usually, but if we do, wrap in []
             // Actually, Chinese object keys are rare. Let's skip.
             return;
          } else {
            path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]));
          }

        } else {
          // Module level or non-component function
          needsI18nImport = true;
          if (path.parentPath.isJSXAttribute()) {
            path.replaceWith(t.jsxExpressionContainer(
              t.callExpression(
                t.memberExpression(t.identifier('i18n'), t.identifier('t')),
                [t.stringLiteral(key)]
              )
            ));
          } else if (path.parentPath.isObjectProperty() && path.parentPath.node.key === path.node) {
             return;
          } else {
            path.replaceWith(
              t.callExpression(
                t.memberExpression(t.identifier('i18n'), t.identifier('t')),
                [t.stringLiteral(key)]
              )
            );
          }
        }
      },
      JSXText(path) {
        if (!isChinese(path.node.value)) return;
        const text = path.node.value.trim();
        if (!text) return;

        const key = getTranslationKey(text);
        
        // Find enclosing function
        const fnPath = path.findParent(p => p.isFunctionDeclaration() || p.isArrowFunctionExpression() || p.isFunctionExpression());
        
        if (fnPath) {
          needsTranslationImport = true;
          if (!injectedFunctions.has(fnPath.node)) {
            injectedFunctions.add(fnPath.node);
            
            let hasUseTranslation = false;
            if (fnPath.node.body.type === 'BlockStatement') {
              for (const stmt of fnPath.node.body.body) {
                if (stmt.type === 'VariableDeclaration') {
                  for (const decl of stmt.declarations) {
                    if (decl.init && decl.init.type === 'CallExpression' && decl.init.callee.name === 'useTranslation') {
                      hasUseTranslation = true;
                    }
                  }
                }
              }
              if (!hasUseTranslation) {
                const hookAST = parser.parse('const { t } = useTranslation();', { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body[0];
                fnPath.node.body.body.unshift(hookAST);
              }
            }
          }
          
          path.replaceWith(t.jsxExpressionContainer(
            t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
          ));
        } else {
          needsI18nImport = true;
          path.replaceWith(t.jsxExpressionContainer(
            t.callExpression(
              t.memberExpression(t.identifier('i18n'), t.identifier('t')),
              [t.stringLiteral(key)]
            )
          ));
        }
      },
      TemplateLiteral(path) {
        // We will just skip template literals for simplicity, or handle them as one big string if they have no expressions.
        // If they have expressions, it's complex. Let's just convert simple ones.
        if (path.node.expressions.length === 0 && isChinese(path.node.quasis[0].value.raw)) {
          const text = path.node.quasis[0].value.raw.trim();
          if (!text) return;
          const key = getTranslationKey(text);
          
          const fnPath = path.findParent(p => p.isFunctionDeclaration() || p.isArrowFunctionExpression() || p.isFunctionExpression());
          if (fnPath) {
            needsTranslationImport = true;
            if (!injectedFunctions.has(fnPath.node) && fnPath.node.body.type === 'BlockStatement') {
              injectedFunctions.add(fnPath.node);
              const hookAST = parser.parse('const { t } = useTranslation();', { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body[0];
              fnPath.node.body.body.unshift(hookAST);
            }
            path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]));
          } else {
            needsI18nImport = true;
            path.replaceWith(
              t.callExpression(
                t.memberExpression(t.identifier('i18n'), t.identifier('t')),
                [t.stringLiteral(key)]
              )
            );
          }
        }
      }
    });

    if (needsTranslationImport || needsI18nImport) {
      // Check for existing imports
      let hasUseTranslationImport = false;
      let hasI18nImport = false;
      let lastImportIndex = -1;
      
      for (let i = 0; i < ast.program.body.length; i++) {
        const stmt = ast.program.body[i];
        if (stmt.type === 'ImportDeclaration') {
          lastImportIndex = i;
          if (stmt.source.value === 'react-i18next') {
            for (const spec of stmt.specifiers) {
              if (spec.imported && spec.imported.name === 'useTranslation') {
                hasUseTranslationImport = true;
              }
            }
          }
          if (stmt.source.value === '../i18n' || stmt.source.value === '../../i18n') {
            for (const spec of stmt.specifiers) {
              if (spec.local.name === 'i18n') hasI18nImport = true;
            }
          }
        }
      }

      if (needsTranslationImport && !hasUseTranslationImport) {
        const imp = parser.parse("import { useTranslation } from 'react-i18next';", { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body[0];
        ast.program.body.splice(lastImportIndex + 1, 0, imp);
      }
      
      // Calculate relative path for i18n import
      if (needsI18nImport && !hasI18nImport) {
        const relativeLevel = file.split(path.sep).length - SRC_DIR.split(path.sep).length;
        const prefix = relativeLevel === 1 ? './' : '../'.repeat(relativeLevel - 1);
        const imp = parser.parse(`import i18n from '${prefix}i18n';`, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body[0];
        ast.program.body.splice(0, 0, imp);
      }

      const output = generate(ast, { retainLines: false });
      fs.writeFileSync(file, output.code, 'utf8');
      processedFiles++;
    }
  } catch (err) {
    console.error(`Failed to process ${file}:`, err);
  }
}

// Write dictionary
fs.writeFileSync(LOCALE_FILE, JSON.stringify(dictionary, null, 2) + '\n', 'utf8');
console.log(`Successfully processed ${processedFiles} files.`);
console.log(`Generated ${Object.keys(dictionary).length} translation keys.`);
