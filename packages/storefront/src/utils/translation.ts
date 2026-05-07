/**
 * Returns the translated version of a string based on the provided translations object.
 * Fallbacks to the base string if translation for the language is not found.
 */
export const getTranslated = (
  base: string,
  translations: any,
  lang: string
): string => {
  if (!translations || typeof translations !== 'object') return base || '';
  
  const shortLang = lang.split('-')[0];

  // 1. Try full language code (e.g., zh-TW, fr-FR)
  if (translations[lang]) return translations[lang];
  
  // 2. Try short language code (e.g., zh, fr)
  if (translations[shortLang]) return translations[shortLang];
  
  // 3. For non-Chinese/English users, try English fallback
  if (!shortLang.startsWith('zh') && shortLang !== 'en' && translations['en']) {
    return translations['en'];
  }

  // 4. Fallback to base string (usually traditional Chinese in this app)
  return base || translations['en'] || '';
};
