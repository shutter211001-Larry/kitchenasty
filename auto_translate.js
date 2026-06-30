const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Please set GEMINI_API_KEY environment variable.");
  process.exit(1);
}

const apps = ['adminfront', 'erpfront', 'storefront'];
const targetLangs = {
  'en': 'English',
  'ja': 'Japanese',
  'ko': 'Korean'
};

function flattenKeys(obj, prefix = '') {
  let res = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(res, flattenKeys(obj[key], `${prefix}${key}.`));
    } else {
      res[`${prefix}${key}`] = obj[key];
    }
  }
  return res;
}

function unflattenKeys(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

function chunkObject(obj, size) {
  const keys = Object.keys(obj);
  const chunks = [];
  for (let i = 0; i < keys.length; i += size) {
    const chunk = {};
    keys.slice(i, i + size).forEach(k => {
      chunk[k] = obj[k];
    });
    chunks.push(chunk);
  }
  return chunks;
}

async function translateChunk(chunk, langName) {
  const prompt = `Translate the following JSON string values from Traditional Chinese to ${langName}. Return ONLY a valid JSON object matching the input structure, with values translated. Do not wrap in markdown tags. Input:\n${JSON.stringify(chunk, null, 2)}`;
  
  const postData = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            return reject(new Error(json.error.message));
          }
          const text = json.candidates[0].content.parts[0].text;
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}\nResponse was: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  for (const app of apps) {
    const localesDir = path.join(__dirname, 'packages', app, 'src', 'i18n', 'locales');
    if (!fs.existsSync(localesDir)) continue;

    const sourcePath = path.join(localesDir, 'zh-TW.json');
    if (!fs.existsSync(sourcePath)) continue;

    console.log(`Processing app: ${app}`);
    const sourceObj = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const flatSource = flattenKeys(sourceObj);

    for (const [langCode, langName] of Object.entries(targetLangs)) {
      const targetPath = path.join(localesDir, `${langCode}.json`);
      let targetObj = {};
      if (fs.existsSync(targetPath)) {
        targetObj = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      }
      const flatTarget = flattenKeys(targetObj);

      const missing = {};
      for (const [k, v] of Object.entries(flatSource)) {
        if (!flatTarget[k]) {
          missing[k] = v;
        }
      }

      const missingKeysCount = Object.keys(missing).length;
      if (missingKeysCount === 0) {
        console.log(`  ${langCode} is up to date.`);
        continue;
      }

      console.log(`  Translating ${missingKeysCount} keys for ${langCode}...`);
      
      const chunks = chunkObject(missing, 100);
      for (let i = 0; i < chunks.length; i++) {
        console.log(`    Chunk ${i + 1}/${chunks.length}...`);
        
        let success = false;
        let retries = 3;
        
        while (!success && retries > 0) {
          try {
            const translatedChunk = await translateChunk(chunks[i], langName);
            Object.assign(flatTarget, translatedChunk);
            success = true;
            // Sleep 3 seconds to avoid rate limits
            await new Promise(r => setTimeout(r, 4000));
          } catch (err) {
            console.error(`    Error translating chunk ${i + 1}:`, err.message);
            if (err.message.includes('Quota exceeded') || err.message.includes('high demand') || err.message.includes('overloaded')) {
               console.log('    API limit or high demand. Waiting 60 seconds...');
               await new Promise(r => setTimeout(r, 60000));
            } else {
               retries--;
               if (retries === 0) {
                 console.error(`    Failed chunk ${i + 1} after retries. Aborting to prevent data corruption.`);
                 process.exit(1);
               } else {
                 console.log(`    Retrying chunk ${i + 1}...`);
                 await new Promise(r => setTimeout(r, 2000));
               }
            }
          }
        }
      }

      const newTargetObj = unflattenKeys(flatTarget);
      fs.writeFileSync(targetPath, JSON.stringify(newTargetObj, null, 2) + '\n');
      console.log(`  Saved ${targetPath}`);
    }
  }
}

main().catch(console.error);
