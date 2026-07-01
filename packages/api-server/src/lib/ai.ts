import logger from './logger.js';

import prisma from './db.js';

async function getApiKey() {
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const googleSettings = siteSettings?.googleSettings ? (typeof siteSettings.googleSettings === 'string' ? JSON.parse(siteSettings.googleSettings) : siteSettings.googleSettings) : {};
  return googleSettings.geminiApiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
}

let cachedOrderedModels: string[] | null = null;

/**
 * Fully dynamic model discovery. Identifies and prioritizes Flash models 
 * to maximize quota availability without hardcoding specific versions.
 */
async function getOrderedModels(apiKey: string): Promise<string[]> {
  if (cachedOrderedModels) return cachedOrderedModels;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      logger.warn(`[DEBUG] ListModels failed (${response.status}), using static fallback.`);
      return ['models/gemini-1.5-flash'];
    }
    
    const data = await response.json();
    const allModels = (data.models || []) as { name: string; supportedGenerationMethods: string[] }[];
    
    // Filter for models that support content generation
    const usable = allModels.filter(m => m.supportedGenerationMethods.includes('generateContent'));
    
    // Prioritize Flash models (higher quota, faster) over Pro models
    const flashModels = usable.filter(m => m.name.toLowerCase().includes('flash'));
    const otherModels = usable.filter(m => !m.name.toLowerCase().includes('flash'));
    
    cachedOrderedModels = [...flashModels, ...otherModels].map(m => m.name);
    logger.info(`[DEBUG] AI Strategy dynamic ordering: ${cachedOrderedModels.join(', ')}`);
    
    return cachedOrderedModels.length > 0 ? cachedOrderedModels : ['models/gemini-1.5-flash'];
  } catch (error) {
    logger.error(error as any, '[DEBUG] Dynamic discovery failed.');
    return ['models/gemini-1.5-flash'];
  }
}

/**
 * High-availability fetch wrapper that automatically falls back to 
 * the next available model if the current one fails (e.g., 429 Quota Exceeded).
 */
async function fetchWithFallback(apiKey: string, prompt: string): Promise<any> {
  const models = await getOrderedModels(apiKey);
  
  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        })
      });

      if (response.ok) {
        return await response.json();
      }

      const errorBody = await response.json().catch(() => ({}));
      logger.warn(`[DEBUG] Model ${model} failed (Status: ${response.status}). Reason: ${JSON.stringify(errorBody)}. Trying next...`);
      
      // If we hit a quota limit, clear cache to force re-discovery next time just in case
      if (response.status === 429) {
         // Optionally skip this model for the current process if it's exhausted
      }
    } catch (error) {
      logger.error(`[DEBUG] Exception during fetch with ${model}, skipping to next.`);
    }
  }
  
  return null;
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
  
  try {
    return JSON.parse(cleanedText.trim());
  } catch (e) {
    logger.error(`[DEBUG] JSON parsing failed. Raw text: ${text}`);
    throw e;
  }
}

/**
 * Translates text into multiple languages using Gemini AI.
 */
export async function translateContent(
  text: string,
  targetLanguages: string[],
  sourceLanguage: string = 'its original language'
): Promise<TranslationResult> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    logger.warn('AI Translation skipped: GEMINI_API_KEY not configured.');
    return {};
  }
  
  if (!text || targetLanguages.length === 0) return {};

  const prompt = `
    You are a professional translator for a global food ordering platform.
    Identify the source language of the text, and translate it into ALL of the following target languages: ${targetLanguages.join(', ')}.
    If the text is already in one of the target languages, you must still output it for that language code.
    
    Text to translate: "${text}"
    
    CRITICAL RULE: Do NOT translate, modify, or translate the words inside any text enclosed in curly braces {}.
    For example, placeholder variables like {使用者}, {訂單編號}, {餐點內容}, and {取餐時間/做好馬上取} must be preserved EXACTLY as-is in the translated text.
    
    Return ONLY a valid JSON object where keys are language codes and values are the translations.
    Language codes to use: ${targetLanguages.join(', ')}.
    
    Example output:
    {
      "en": "Pizza",
      "th": "พิซซ่า"
    }
  `;

  try {
    const data = await fetchWithFallback(apiKey, prompt);
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      logger.warn('[DEBUG] No valid response from any AI model in translateContent');
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
  sourceLanguage: string = 'its original language'
): Promise<{ [key: string]: TranslationResult }> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      logger.warn('AI Translation skipped: GEMINI_API_KEY not configured.');
      return {};
    }
    
    if (fields.length === 0) return {};

    const prompt = `
      You are a professional translator for a global food ordering platform.
      Identify the source language of each field, and translate it into ALL of the following target languages: ${targetLanguages.join(', ')}.
      If a field's text is already in one of the target languages, you must still output it for that language code.
      
      Fields:
      ${fields.map(f => `${f.key}: "${f.value}"`).join('\n')}
      
      CRITICAL RULE: Do NOT translate, modify, or translate the words inside any text enclosed in curly braces {}.
      For example, placeholder variables like {使用者}, {訂單編號}, {餐點內容}, and {取餐時間/做好馬上取} must be preserved EXACTLY as-is in the translated text.
      
      Return ONLY a valid JSON object where keys are the field keys, and values are objects mapping language codes to translations.
      
      Example output:
      {
        "name": { "en": "Pizza", "th": "..." }
      }
    `;

    const data = await fetchWithFallback(apiKey, prompt);
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
       logger.warn('[DEBUG] No valid response from any AI model in translateFields');
       return {};
    }

    logger.info(`[DEBUG] Successful AI response: ${resultText}`);
    return parseJSONWithMarkdownFallback(resultText);
  } catch (error) {
    logger.error(error as any, '[DEBUG] Exception in translateFields:');
    return {};
  }
}

/**
 * Generic method to prompt Gemini and return a parsed JSON object
 */
export async function generateGeminiObject(prompt: string): Promise<any> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured.');
  }

  const data = await fetchWithFallback(apiKey, prompt);
  const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!resultText) {
    throw new Error('No valid response from AI model');
  }

  return parseJSONWithMarkdownFallback(resultText);
}
