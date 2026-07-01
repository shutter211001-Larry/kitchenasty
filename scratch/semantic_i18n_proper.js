const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Please set GEMINI_API_KEY environment variable.");
  process.exit(1);
}

const apps = ['adminfront', 'storefront'];
const workspace = path.join(__dirname, '..');

// Helper to walk directory
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

// 1. Scan codebase for autoGen keys
const keyUsage = {}; // autoGen.admin.key65 -> Set of file basenames
const fileContentMap = {};

apps.forEach(app => {
  const srcDir = path.join(workspace, 'packages', app, 'src');
  const files = walkSync(srcDir);
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    fileContentMap[file] = content;
    
    // Regex to match t('autoGen.admin.keyXX') or t("autoGen.store.keyXX")
    const regex = /t\(['"](autoGen\.[a-zA-Z0-9_\.]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const key = match[1];
      if (!keyUsage[key]) keyUsage[key] = new Set();
      keyUsage[key].add(path.basename(file, path.extname(file)));
    }
  });
});

console.log(`Found ${Object.keys(keyUsage).length} distinct autoGen keys in source code.`);

// 2. Read zh-TW translations to get the Chinese text
const zhTranslations = {}; // autoGenKey -> chinese string
apps.forEach(app => {
  const zhPath = path.join(workspace, 'packages', app, 'src', 'i18n', 'locales', 'zh-TW.json');
  if (fs.existsSync(zhPath)) {
    const data = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    if (data.autoGen) {
      // It's nested: data.autoGen.admin.key65 or similar
      const prefix = app === 'adminfront' ? 'admin' : 'store';
      if (data.autoGen[prefix]) {
        for (const [k, v] of Object.entries(data.autoGen[prefix])) {
          zhTranslations[`autoGen.${prefix}.${k}`] = v;
        }
      }
    }
  }
});

// 3. Assign namespaces
const keyToNamespace = {}; // autoGenKey -> 'common' or 'attendance' (lowercased)
const dedupeMap = {}; // chinese text -> generated semantic key suffix

for (const [key, files] of Object.entries(keyUsage)) {
  if (files.size > 1) {
    keyToNamespace[key] = 'common';
  } else if (files.size === 1) {
    const filename = Array.from(files)[0];
    keyToNamespace[key] = filename.charAt(0).toLowerCase() + filename.slice(1);
  }
}

// 4. Translate with Gemini
const cachePath = path.join(__dirname, 'semantic_mapping.json');
let semanticMap = {}; // autoGenKey -> full.namespace.semanticKey
if (fs.existsSync(cachePath)) {
  semanticMap = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  console.log(`Loaded ${Object.keys(semanticMap).length} cached keys.`);
}

async function translateChunk(chunkObj) {
  const prompt = `Translate these Traditional Chinese UI strings into short, meaningful camelCase English variable names (max 3-4 words). Do not include any namespaces. ONLY return a valid JSON object mapping the exact input keys to the camelCase english names. Ignore placeholders like {{val}} in the key name.
Input: ${JSON.stringify(chunkObj, null, 2)}`;
  
  const postData = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          const text = json.candidates[0].content.parts[0].text;
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`Parse failed: ${err.message}. Data: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  // Collect missing translations
  const missing = {};
  for (const key of Object.keys(keyUsage)) {
    if (!semanticMap[key] && zhTranslations[key]) {
      missing[key] = zhTranslations[key];
    }
  }

  const missingKeys = Object.keys(missing);
  if (missingKeys.length > 0) {
    console.log(`Translating ${missingKeys.length} missing keys via Gemini...`);
    
    // Chunk size 50
    const chunkSize = 50;
    for (let i = 0; i < missingKeys.length; i += chunkSize) {
      const chunkKeys = missingKeys.slice(i, i + chunkSize);
      const chunkObj = {};
      chunkKeys.forEach(k => chunkObj[k] = missing[k]);
      
      console.log(`Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(missingKeys.length/chunkSize)}...`);
      
      let success = false;
      let retries = 3;
      while (!success && retries > 0) {
        try {
          const result = await translateChunk(chunkObj);
          for (const [k, camel] of Object.entries(result)) {
            const ns = keyToNamespace[k] || 'common';
            // Simple deduplication logic: if two different keys map to the same namespace + camelCase, 
            // the last one overwrites, BUT since we merge them in translation files later, they point to same text.
            semanticMap[k] = `${ns}.${camel}`;
          }
          success = true;
          fs.writeFileSync(cachePath, JSON.stringify(semanticMap, null, 2));
          await new Promise(r => setTimeout(r, 4000));
        } catch (err) {
          console.error(`Chunk error: ${err.message}`);
          if (err.message.includes('Quota') || err.message.includes('429')) {
             console.log('Rate limited. Waiting 30s...');
             await new Promise(r => setTimeout(r, 30000));
          } else {
             retries--;
             await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
      if (!success) {
        console.error("Failed to translate chunk. Aborting.");
        process.exit(1);
      }
    }
  }

  console.log("Translation complete. Starting AST replacements...");

  // 5. Replace in TSX/TS files
  let modifiedFiles = 0;
  for (const [file, content] of Object.entries(fileContentMap)) {
    let newContent = content;
    let modified = false;
    const regex = /t\(['"](autoGen\.[a-zA-Z0-9_\.]+)['"]/g;
    
    newContent = newContent.replace(regex, (match, p1) => {
      if (semanticMap[p1]) {
        modified = true;
        return `t('${semanticMap[p1]}'`;
      }
      return match;
    });

    if (modified) {
      fs.writeFileSync(file, newContent, 'utf8');
      modifiedFiles++;
    }
  }
  console.log(`Updated ${modifiedFiles} source files.`);

  // 6. Restructure Locale JSON files
  console.log("Restructuring locale files...");
  
  function deepSet(obj, pathStr, value) {
    const parts = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  apps.forEach(app => {
    const localesDir = path.join(workspace, 'packages', app, 'src', 'i18n', 'locales');
    if (!fs.existsSync(localesDir)) return;
    
    const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    localeFiles.forEach(file => {
      const filePath = path.join(localesDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const isAppAdmin = app === 'adminfront';
      const prefix = isAppAdmin ? 'admin' : 'store';
      
      // Extract old translations before deleting
      const oldTranslations = {};
      if (data.autoGen && data.autoGen[prefix]) {
         for (const [k, v] of Object.entries(data.autoGen[prefix])) {
            oldTranslations[`autoGen.${prefix}.${k}`] = v;
         }
      }
      
      // Delete old autoGen root
      delete data.autoGen;

      // Inject new structure
      for (const [oldKey, val] of Object.entries(oldTranslations)) {
         const newSemanticPath = semanticMap[oldKey];
         if (newSemanticPath) {
           // We might map multiple oldKeys (which had identical Chinese text) to the SAME newSemanticPath.
           // This automatically deduplicates them in the output JSON!
           deepSet(data, newSemanticPath, val);
         }
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    });
  });

  console.log("Success! All keys replaced and JSON restructured.");
}

run().catch(console.error);
