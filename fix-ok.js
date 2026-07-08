const { Project, SyntaxKind } = require('ts-morph');
const project = new Project();
project.addSourceFilesAtPaths('packages/adminfront/src/**/*.{ts,tsx}');

let modifiedFiles = 0;

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;

  // 1. Remove the injected try-catch blocks
  sourceFile.getVariableStatements().forEach(stmt => {
    if (stmt.getText().includes('let data: any;')) {
      const parent = stmt.getParent();
      const stmts = parent.getStatements();
      const idx = stmts.indexOf(stmt);
      if (idx >= 0 && idx + 1 < stmts.length) {
        const nextStmt = stmts[idx + 1];
        if (nextStmt.getKind() === SyntaxKind.TryStatement && nextStmt.getText().includes('data = res')) {
          stmt.remove();
          nextStmt.remove();
          changed = true;
        }
      }
    }
  });

  // 2. Replace 'data.error' with 'res.error' since data is now res, OR remove res.ok blocks
  // Actually, if we just remove if (!res.ok) we also need to change data.something to res.something?
  // Wait, my previous script injected:
  // let data: any; try { data = res; } ...
  // So the rest of the code still uses `data.data` or `data.token`!
  // If we remove `let data: any; try { data = res; }`, then `data` is NOT DEFINED!
  // We MUST replace `data` with `res` in the scope, or just change `let data: any; ... data = res;` to `const data = res;`!
  
  // Wait, the API client returns `data`. Let's just do `const data = res;`
  sourceFile.getVariableStatements().forEach(stmt => {
    if (stmt.getText().includes('let data: any;')) {
      const parent = stmt.getParent();
      const stmts = parent.getStatements();
      const idx = stmts.indexOf(stmt);
      if (idx >= 0 && idx + 1 < stmts.length) {
        const nextStmt = stmts[idx + 1];
        if (nextStmt.getKind() === SyntaxKind.TryStatement && nextStmt.getText().includes('data = res')) {
          // Replace both with `const data: any = res;`
          const parentBlock = parent;
          parentBlock.insertVariableStatement(idx, {
            declarations: [{ name: 'data', initializer: 'res', type: 'any' }]
          });
          stmt.remove();
          nextStmt.remove();
          changed = true;
        }
      }
    }
  });

  // 3. Remove if (!res.ok) statements
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.IfStatement) {
      const expr = node.getExpression();
      if (expr.getText() === '!res.ok' || expr.getText() === '!langRes.ok' || expr.getText() === '!uploadRes.ok') {
        node.remove();
        changed = true;
      }
    }
  });

  if (changed) {
    sourceFile.saveSync();
    modifiedFiles++;
    console.log(`Cleaned ${sourceFile.getFilePath()}`);
  }
}

console.log(`Modified ${modifiedFiles} files.`);
