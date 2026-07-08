const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'packages/adminfront/src/pages');
const compDir = path.join(__dirname, 'packages/adminfront/src/components');

function fixJson(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  content = content.replace(/=\s*await\s+res\.json\(\);/g, '= res;');
  content = content.replace(/data\s*=\s*await\s+res\.json\(\);/g, 'data = res;');
  content = content.replace(/const\s+data\s*=\s*await\s+res\.json\(\);/g, 'const data = res;');
  content = content.replace(/let\s+data\s*=\s*await\s+res\.json\(\);/g, 'let data = res;');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed json: ${filePath}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixJson(fullPath);
    }
  }
}

traverse(directoryPath);
traverse(compDir);
