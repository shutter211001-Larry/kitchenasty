const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const IGNORED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz'];

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Replace Shutter with Shutter
    if (content.includes('Shutter')) {
      content = content.replace(/Shutter/g, 'Shutter');
      changed = true;
    }
    
    // Replace shutter with shutter
    if (content.includes('shutter')) {
      content = content.replace(/shutter/g, 'shutter');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (err) {
    // skip binary files or files that can't be read
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!IGNORED_DIRS.includes(file)) {
            walkDir(fullPath);
          }
        } else {
          if (!IGNORED_EXTS.includes(path.extname(file).toLowerCase())) {
            replaceInFile(fullPath);
          }
        }
      } catch (err) {
        // skip files that can't be stat-ed
      }
    }
  } catch (err) {
    // skip dirs that can't be read
  }
}

walkDir(process.cwd());
console.log('Global replace completed.');
