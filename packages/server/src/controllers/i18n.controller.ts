import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export async function saveMissingKey(req: Request, res: Response): Promise<void> {
  const { lng, ns } = req.params;
  const missingKeys = req.body;
  
  if (!lng || !ns || typeof missingKeys !== 'object') {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  // Which project is this? We can pass it as a query param or header, e.g., ?project=admin
  const project = req.query.project as string;
  if (!project || !['admin', 'storefront', 'shutter-erp-frontend'].includes(project)) {
    res.status(400).json({ error: 'Invalid project' });
    return;
  }

  const localePath = path.join(process.cwd(), '..', project, 'src', 'i18n', 'locales', `${lng}.json`);

  try {
    let currentData: any = {};
    if (fs.existsSync(localePath)) {
      const fileContent = fs.readFileSync(localePath, 'utf8');
      currentData = JSON.parse(fileContent);
    }

    let updated = false;
    for (const [key, fallbackValue] of Object.entries(missingKeys)) {
      const keyParts = key.split('.');
      let obj = currentData;
      
      for (let i = 0; i < keyParts.length; i++) {
        const part = keyParts[i];
        if (i === keyParts.length - 1) {
          if (obj[part] === undefined) {
            obj[part] = fallbackValue || key;
            updated = true;
          }
        } else {
          if (!obj[part] || typeof obj[part] !== 'object') {
            obj[part] = {};
          }
          obj = obj[part];
        }
      }
    }

    if (updated) {
      fs.writeFileSync(localePath, JSON.stringify(currentData, null, 2) + '\n', 'utf8');
      console.log(`[i18n] Saved missing keys for ${project}/${lng}:`, Object.keys(missingKeys));
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[i18n] Error saving missing keys:', err);
    res.status(500).json({ error: 'Failed to save missing keys' });
  }
}
