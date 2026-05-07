import { translateFields } from './packages/server/src/lib/ai.js';
import { autoTranslateMenuItem } from './packages/server/src/lib/translation-helper.js';
import 'dotenv/config'; // We don't have dotenv, so I'll set process.env.GEMINI_API_KEY manually

process.env.GEMINI_API_KEY = "AIzaSyAvafZO9fW9O_7eyHKs6Y78F7ohBDvlie4";

async function run() {
  const data = {
    name: '瑪格麗特',
    nameTranslations: {
      en: 'Old English',
      th: 'Old Thai',
      id: 'Old Id',
      vi: 'Old Vi',
      tl: 'Old Tl',
      es: 'Old Es',
      fr: 'Old Fr',
      de: 'Old De',
      it: 'Old It',
      pt: 'Old Pt'
    }
  };
  
  const existingData = {
    name: '瑪格麗特A'
  };
  
  console.log("Before:", data.nameTranslations);
  const translated = await autoTranslateMenuItem(data, existingData);
  console.log("After:", translated.nameTranslations);
}

run();
