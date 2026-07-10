import { Project, SyntaxKind, Node } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const packages = ['adminfront', 'erpfront', 'saasfront', 'storefront'];

// 1. Create lib/confirm.ts and components/ConfirmGlobal.tsx in each package
for (const pkg of packages) {
  const libDir = path.join(__dirname, '..', 'packages', pkg, 'src', 'lib');
  const compDir = path.join(__dirname, '..', 'packages', pkg, 'src', 'components');
  
  if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });
  if (!fs.existsSync(compDir)) fs.mkdirSync(compDir, { recursive: true });

  const libConfirmCode = `
type ConfirmOptions = { message: string; title?: string; confirmText?: string; cancelText?: string; isDanger?: boolean };
let resolveFn: ((value: boolean) => void) | null = null;
let listener: ((options: ConfirmOptions) => void) | null = null;

export const confirm = (options: string | ConfirmOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    resolveFn = resolve;
    if (listener) {
      listener(typeof options === 'string' ? { message: options } : options);
    } else {
      resolve(window.confirm(typeof options === 'string' ? options : options.message));
    }
  });
};

export const registerConfirmListener = (fn: (opts: ConfirmOptions) => void) => { listener = fn; };
export const resolveConfirm = (value: boolean) => { if (resolveFn) resolveFn(value); resolveFn = null; };
`;
  fs.writeFileSync(path.join(libDir, 'confirm.ts'), libConfirmCode.trim());

  const compConfirmCode = `
import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { registerConfirmListener, resolveConfirm } from '../lib/confirm';

export function ConfirmGlobal() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<any>(null);

  useEffect(() => {
    registerConfirmListener((opts) => {
      setOptions(opts);
      setIsOpen(true);
    });
  }, []);

  if (!isOpen || !options) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={\`p-3 rounded-full \${options.isDanger || options.message.includes('刪除') ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}\`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-2">{options.title || '請確認'}</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{options.message}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
          <button onClick={() => { resolveConfirm(false); setIsOpen(false); }} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">{options.cancelText || '取消'}</button>
          <button onClick={() => { resolveConfirm(true); setIsOpen(false); }} className={\`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors \${options.isDanger || options.message.includes('刪除') ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}\`}>{options.confirmText || '確認'}</button>
        </div>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(compDir, 'ConfirmGlobal.tsx'), compConfirmCode.trim());
}

// 2. Refactor using ts-morph
const project = new Project();
for (const pkg of packages) {
  project.addSourceFilesAtPaths(path.join(__dirname, '..', 'packages', pkg, 'src', '**', '*.{ts,tsx}'));
}

let modifiedFiles = 0;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  if (filePath.endsWith('lib/confirm.ts') || filePath.endsWith('ConfirmGlobal.tsx')) {
    continue;
  }
  let needsSave = false;
  let needsConfirmImport = false;
  let needsToastImport = false;

  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const call of calls) {
    if (call.wasForgotten()) continue;
    
    const expr = call.getExpression();
    const text = expr.getText();
    
    // Replace window.confirm
    if (text === 'window.confirm' || text === 'confirm') {
      // Check if it's the global confirm, not a local variable
      const symbol = expr.getSymbol();
      if (!symbol || symbol.getDeclarations().some(d => d.getSourceFile().getFilePath().includes('lib.dom.d.ts'))) {
        const parentFunc = call.getFirstAncestorByKind(SyntaxKind.ArrowFunction) || 
                           call.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
                           call.getFirstAncestorByKind(SyntaxKind.FunctionExpression) ||
                           call.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);
        
        if (parentFunc && !parentFunc.isAsync()) {
          parentFunc.setIsAsync(true);
        }
        
        call.replaceWithText('await confirm(' + call.getArguments().map(a => a.getText()).join(', ') + ')');
        needsConfirmImport = true;
        needsSave = true;
      }
    }

    // Replace alert or window.alert
    if (text === 'alert' || text === 'window.alert') {
      const symbol = expr.getSymbol();
      if (!symbol || symbol.getDeclarations().some(d => d.getSourceFile().getFilePath().includes('lib.dom.d.ts'))) {
        call.replaceWithText('toast.error(' + call.getArguments().map(a => a.getText()).join(', ') + ')');
        needsToastImport = true;
        needsSave = true;
      }
    }

    // Replace window.prompt
    if (text === 'prompt' || text === 'window.prompt') {
      const symbol = expr.getSymbol();
      if (!symbol || symbol.getDeclarations().some(d => d.getSourceFile().getFilePath().includes('lib.dom.d.ts'))) {
        expr.replaceWithText('window.prompt'); // Cannot easily make prompt async in inline way without building a Prompt modal. Just warning for now, user didn't mention prompt specifically but let's change to toast if not used?
        // Actually we only have 2 prompts left, let's ignore or replace with window.prompt (no-op)
      }
    }
  }

  if (needsConfirmImport) {
    // Find the relative path to lib/confirm.ts
    const filePath = sourceFile.getFilePath();
    const pkgPath = filePath.substring(0, filePath.indexOf('/src/') + 4);
    const libPath = path.join(pkgPath, 'lib', 'confirm').replace(/\\/g, '/');
    const relativePath = path.relative(path.dirname(filePath), libPath).replace(/\\/g, '/');
    const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
    
    sourceFile.addImportDeclaration({
      namedImports: ['confirm'],
      moduleSpecifier: importPath
    });
  }

  if (needsToastImport) {
    if (!sourceFile.getImportDeclaration(dec => dec.getModuleSpecifierValue() === 'react-hot-toast')) {
      sourceFile.addImportDeclaration({
        namedImports: ['toast'],
        moduleSpecifier: 'react-hot-toast'
      });
    }
  }

  if (needsSave) {
    sourceFile.saveSync();
    modifiedFiles++;
    console.log("Updated " + sourceFile.getFilePath());
  }
}

console.log("Successfully updated " + modifiedFiles + " files.");
