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
    // 2. Fallback to English
    if (lang !== 'en' && translations['en']) return translations['en'];
  }
  // 3. Fallback to base
  return base;
};
