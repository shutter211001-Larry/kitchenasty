/**
 * Returns the translated version of a string based on the provided translations object.
 * Fallbacks to the base string if translation for the language is not found.
 */
export const getTranslated = (
  base: string,
  translations: any,
  lang: string
): string => {
  if (translations && typeof translations === 'object') {
    // 1. Try target language
    if (translations[lang]) return translations[lang];
    
    // 2. For non-Chinese users, if target language is missing, try English fallback before Base
    if (!lang.startsWith('zh') && lang !== 'en' && translations['en']) {
      return translations['en'];
    }
  }

  // 3. Fallback to base (e.g., Chinese name written in the main field)
  if (base) return base;

  // 4. Final safety fallback to English
  if (translations && typeof translations === 'object' && translations['en']) {
    return translations['en'];
  }

  return base;
};
