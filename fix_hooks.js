const fs = require('fs');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const files = glob.sync('packages/erpfront/src/**/*.tsx');

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf-8');
  if (!code.includes('useTranslation')) return;

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });

  let modified = false;

  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.name === 'useTranslation') {
        const varDecl = path.findParent(p => p.isVariableDeclaration());
        if (!varDecl) return;
        
        const block = path.findParent(p => p.isBlockStatement());
        const fn = path.findParent(p => p.isFunction());
        
        if (!fn) return;

        // Determine if fn is a top-level component or custom hook
        let isTopLevel = false;
        
        if (fn.parent.type === 'VariableDeclarator' && /^[A-Z]|use/.test(fn.parent.id.name)) {
          isTopLevel = true;
        } else if (fn.type === 'FunctionDeclaration' && fn.node.id && /^[A-Z]|use/.test(fn.node.id.name)) {
          isTopLevel = true;
        }

        if (!isTopLevel || block.parent !== fn.node) {
          // This hook is inside a non-component function or nested block!
          varDecl.remove();
          modified = true;
          
          // Let's make sure the nearest top-level component has the hook.
          let componentFn = fn.findParent(p => p.isFunction() && (
            (p.parent.type === 'VariableDeclarator' && /^[A-Z]|use/.test(p.parent.id.name)) ||
            (p.type === 'FunctionDeclaration' && p.node.id && /^[A-Z]|use/.test(p.node.id.name))
          ));

          // If the current fn itself happens to be the component (e.g. but hook was inside an if-statement)
          if (isTopLevel && block.parent !== fn.node) {
             componentFn = fn;
          }

          if (componentFn && componentFn.node.body.type === 'BlockStatement') {
            const hasHook = componentFn.node.body.body.some(stmt => 
              stmt.type === 'VariableDeclaration' && 
              stmt.declarations[0].id.properties?.some(prop => prop.key.name === 't')
            );
            if (!hasHook) {
              const hookAST = parser.parse('const { t } = useTranslation();', { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body[0];
              componentFn.node.body.body.unshift(hookAST);
            }
          }
        }
      }
    }
  });

  if (modified) {
    const output = generate(ast, {}, code);
    fs.writeFileSync(file, output.code);
    console.log(`Fixed ${file}`);
  }
});
