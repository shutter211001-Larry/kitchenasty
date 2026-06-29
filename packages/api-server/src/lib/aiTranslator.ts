import fs from 'fs';
import path from 'path';

// AI auto-translation using local Ollama
export async function translateAndSave(term: string, category: 'ingredient' | 'action' | 'unit') {
  const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'th', 'id', 'vi', 'tl', 'ja', 'ko'];
  const projects = ['admin', 'storefront', 'shutter-erp-frontend'];
  
  try {
    const prompt = `Translate the ${category} term "${term}" (which is originally in Traditional Chinese) into the following languages: ${languages.join(', ')}.
Output ONLY a valid JSON object where keys are the language codes and values are the translated strings. Do not output any other text or markdown.
Example format: {"en": "Salt", "ja": "塩"}`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3', // or another available model
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    let translations: Record<string, string> = {};
    
    try {
      translations = JSON.parse(data.response);
    } catch (e) {
      console.error('[i18n] Failed to parse Ollama response:', data.response);
      return;
    }

    // Add original term as zh-TW
    translations['zh-TW'] = term;

    // Save to all 3 projects
    for (const project of projects) {
      for (const [lng, translation] of Object.entries(translations)) {
        if (!translation) continue;
        
        // Ensure language is one of the supported ones
        if (![...languages, 'zh-TW'].includes(lng)) continue;

        const localePath = path.join(process.cwd(), '..', project, 'src', 'i18n', 'locales', `${lng}.json`);
        let currentData: any = {};
        
        if (fs.existsSync(localePath)) {
          try {
            currentData = JSON.parse(fs.readFileSync(localePath, 'utf8'));
          } catch (e) {
            // Ignore parse errors on empty files
          }
        } else {
          // Skip if file doesn't exist, we don't want to create random language files
          if (lng !== 'zh-TW' && lng !== 'en') continue; 
        }

        // We use the original term as the key for i18next
        if (currentData[term] === undefined) {
          currentData[term] = translation;
          fs.writeFileSync(localePath, JSON.stringify(currentData, null, 2) + '\n', 'utf8');
        }
      }
    }
    console.log(`[i18n] Successfully translated and saved "${term}"`);
  } catch (err) {
    console.error(`[i18n] AI Translation failed for "${term}":`, err);
  }
}
