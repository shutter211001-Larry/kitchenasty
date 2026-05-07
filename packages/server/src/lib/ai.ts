import logger from './logger.js';

function getApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
}

export interface TranslationResult {
  [key: string]: string;
}

function parseJSONWithMarkdownFallback(text: string) {
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.substring(7);
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.substring(3);
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3);
  }
  return JSON.parse(cleanedText.trim());
}

/**
 * Translates text into multiple languages using Gemini AI.
 */
export async function translateContent(
  text: string,
  targetLanguages: string[],
  sourceLanguage: string = 'Traditional Chinese'
): Promise<TranslationResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn('AI Translation skipped: GEMINI_API_KEY not configured.');
    return {};
  }

  if (!text || targetLanguages.length === 0) return {};

  const prompt = `
    You are a professional translator for a global food ordering platform.
    Translate the following text from ${sourceLanguage} into these languages: ${targetLanguages.join(', ')}.
    
    Text to translate: "${text}"
    
    Return ONLY a valid JSON object where keys are language codes and values are the translations.
    Language codes to use: ${targetLanguages.join(', ')}.
    
    Example output:
    {
      "en": "Pizza",
      "th": "พิซซ่า"
    }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error('Empty response from Gemini');
    }

    return parseJSONWithMarkdownFallback(resultText);
  } catch (error) {
    logger.error(error as any, 'Translation failed:');
    return {};
  }
}

/**
 * Batch translate a list of fields
 */
export async function translateFields(
  fields: { key: string; value: string }[],
  targetLanguages: string[]
): Promise<{ [key: string]: TranslationResult }> {
  const apiKey = getApiKey();
  if (!apiKey || fields.length === 0) return {};

  const results: { [key: string]: TranslationResult } = {};

  // For simplicity and to avoid prompt token limits, we'll do them in a small batch or one by one
  // For now, let's group them into one big prompt if possible
  const prompt = `
    You are a professional translator for a global food ordering platform.
    Translate the following fields into these languages: ${targetLanguages.join(', ')}.
    
    Fields:
    ${fields.map(f => `${f.key}: "${f.value}"`).join('\n')}
    
    Return ONLY a valid JSON object where keys are the field keys, and values are objects mapping language codes to translations.
    
    Example output:
    {
      "name": { "en": "Pizza", "th": "..." },
      "description": { "en": "Good pizza", "th": "..." }
    }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      })
    });

    const data: any = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
       return {};
    }

    return parseJSONWithMarkdownFallback(resultText);
  } catch (error) {
    logger.error(error as any, 'Batch translation failed:');
    return {};
  }
}
