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
  
  logger.info(`[DEBUG] translateContent using API Key ending in: ...${apiKey.slice(-4)}`);

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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`[DEBUG] Gemini API HTTP ERROR in translateContent: ${response.status} - ${JSON.stringify(errorData)}`);
      return {};
    }

    const data: any = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      logger.warn({ fullResponse: data }, '[DEBUG] Empty response or safety block from Gemini in translateContent');
      return {};
    }

    return parseJSONWithMarkdownFallback(resultText);
  } catch (error) {
    logger.error(error as any, '[DEBUG] Exception in translateContent:');
    return {};
  }
}

/**
 * Batch translate a list of fields
 */
export async function translateFields(
  fields: { key: string; value: string }[],
  targetLanguages: string[],
  sourceLanguage: string = 'Traditional Chinese'
): Promise<{ [key: string]: TranslationResult }> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.warn('AI Translation skipped: GEMINI_API_KEY not configured.');
      return {};
    }
    
    // Debug log to verify API key presence safely
    logger.info(`[DEBUG] Using API Key ending in: ...${apiKey.slice(-4)}`);

    if (fields.length === 0) return {};

    const results: { [key: string]: TranslationResult } = {};

    const prompt = `
      You are a professional translator for a global food ordering platform.
      Translate the following fields from ${sourceLanguage} into these languages: ${targetLanguages.join(', ')}.
      
      Fields:
      ${fields.map(f => `${f.key}: "${f.value}"`).join('\n')}
      
      Return ONLY a valid JSON object where keys are the field keys, and values are objects mapping language codes to translations.
      
      Example output:
      {
        "name": { "en": "Pizza", "th": "..." }
      }
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`[DEBUG] Gemini API HTTP ERROR in translateFields: ${response.status} - ${JSON.stringify(errorData)}`);
      return {};
    }

    const data: any = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
       logger.warn({ fullResponse: data }, '[DEBUG] Empty response or safety block from Gemini in translateFields');
       return {};
    }

    logger.info(`[DEBUG] Raw AI response from translateFields: ${resultText}`);
    return parseJSONWithMarkdownFallback(resultText);
  } catch (error) {
    logger.error(error as any, '[DEBUG] Exception in translateFields:');
    return {};
  }
}
