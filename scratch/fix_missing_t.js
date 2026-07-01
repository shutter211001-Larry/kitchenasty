const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, '../packages/adminfront/tsconfig.json'),
});

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
  const filePath = path.join(__dirname, '../packages/adminfront/src', 'components', fileName);
  let file = project.getSourceFile(filePath);
  if (!file) {
    const pagePath = path.join(__dirname, '../packages/adminfront/src', 'pages', fileName);
    file = project.getSourceFile(pagePath);
  }
  
  if (!file) {
    console.log(`Could not find ${fileName}`);
    continue;
  }

  let modified = false;

  // Add import if missing
  if (!file.getImportDeclaration(dec => dec.getModuleSpecifierValue() === 'react-i18next')) {
    file.addImportDeclaration({
      namedImports: ['useTranslation'],
      moduleSpecifier: 'react-i18next'
    });
    modified = true;
  }

  // Find all exported functions or arrow functions
  const exportedDecls = [
    ...file.getFunctions().filter(f => f.isExported()),
    ...file.getVariableStatements().filter(v => v.isExported())
  ];

  for (const decl of exportedDecls) {
    if (decl.getKind() === SyntaxKind.FunctionDeclaration) {
      const body = decl.getBody();
      if (body && decl.getText().includes('t(') && !body.getText().includes('const { t } = useTranslation()')) {
        body.insertStatements(0, 'const { t } = useTranslation();');
        modified = true;
      }
    } else if (decl.getKind() === SyntaxKind.VariableStatement) {
      const dlist = decl.getDeclarations();
      for (const d of dlist) {
        const init = d.getInitializer();
        if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)) {
          const body = init.getBody();
          if (body && body.getKind() === SyntaxKind.Block && init.getText().includes('t(') && !body.getText().includes('const { t } = useTranslation()')) {
            body.insertStatements(0, 'const { t } = useTranslation();');
            modified = true;
          }
        }
      }
    }
  }

  // Special case for LocationForm.tsx DAYS issue
  if (fileName === 'LocationForm.tsx') {
    const text = file.getFullText();
    if (text.includes('DAYS.map(')) {
      file.replaceWithText(text.replace(/DAYS\.map\(\(\_, i\)/g, 'Array.from({ length: 7 }).map((_, i: number)'));
      modified = true;
    }
  }

  if (modified) {
    file.saveSync();
    console.log(`Fixed ${fileName}`);
  }
}
