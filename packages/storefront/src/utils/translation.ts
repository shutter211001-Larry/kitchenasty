/**
 * Returns the translated version of a string based on the provided translations object.
 * Fallbacks to the base string if translation for the language is not found.
 */
export const getTranslated = (
  base: string,
  translations: any,
  lang: string
): string => {
  if (translations && typeof translations === 'object' && translations[lang]) {
    return translations[lang];
  }
  return base;
};
