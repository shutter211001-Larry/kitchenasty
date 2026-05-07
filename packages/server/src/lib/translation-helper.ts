import { translateContent, translateFields } from './ai.js';
import logger from './logger.js';

export const SUPPORTED_LANGUAGES = ['en', 'th', 'id', 'vi', 'tl', 'es', 'fr', 'de', 'it', 'pt'];

/**
 * Automatically translates a menu item's fields if they are missing translations.
 */
export async function autoTranslateMenuItem(data: any) {
  try {
    const fieldsToTranslate = [];

    // Check name
    if (data.name && (!data.nameTranslations || Object.keys(data.nameTranslations).length < SUPPORTED_LANGUAGES.length)) {
      fieldsToTranslate.push({ key: 'name', value: data.name });
    }

    // Check description
    if (data.description && (!data.descriptionTranslations || Object.keys(data.descriptionTranslations).length < SUPPORTED_LANGUAGES.length)) {
      fieldsToTranslate.push({ key: 'description', value: data.description });
    }

    // Check unit
    if (data.unit && (!data.unitTranslations || Object.keys(data.unitTranslations).length < SUPPORTED_LANGUAGES.length)) {
      fieldsToTranslate.push({ key: 'unit', value: data.unit });
    }

    if (fieldsToTranslate.length === 0) return data;

    logger.info(`Auto-translating menu item: ${data.name}`);
    const translations = await translateFields(fieldsToTranslate, SUPPORTED_LANGUAGES);

    if (translations.name) {
      data.nameTranslations = { ...(data.nameTranslations || {}), ...translations.name };
    }
    if (translations.description) {
      data.descriptionTranslations = { ...(data.descriptionTranslations || {}), ...translations.description };
    }
    if (translations.unit) {
      data.unitTranslations = { ...(data.unitTranslations || {}), ...translations.unit };
    }

    return data;
  } catch (error) {
    logger.error('Auto-translation helper failed:', error);
    return data;
  }
}

/**
 * Automatically translates a category's fields.
 */
export async function autoTranslateCategory(data: any) {
  try {
    const fieldsToTranslate = [];

    if (data.name && (!data.nameTranslations || Object.keys(data.nameTranslations).length < SUPPORTED_LANGUAGES.length)) {
      fieldsToTranslate.push({ key: 'name', value: data.name });
    }

    if (data.description && (!data.descriptionTranslations || Object.keys(data.descriptionTranslations).length < SUPPORTED_LANGUAGES.length)) {
      fieldsToTranslate.push({ key: 'description', value: data.description });
    }

    if (fieldsToTranslate.length === 0) return data;

    const translations = await translateFields(fieldsToTranslate, SUPPORTED_LANGUAGES);

    if (translations.name) {
      data.nameTranslations = { ...(data.nameTranslations || {}), ...translations.name };
    }
    if (translations.description) {
      data.descriptionTranslations = { ...(data.descriptionTranslations || {}), ...translations.description };
    }

    return data;
  } catch (error) {
    return data;
  }
}

/**
 * Automatically translates site settings sections.
 */
export async function autoTranslateSiteSettings(data: any) {
  try {
    // Translate Hero Section
    if (data.heroSection) {
      const hero = data.heroSection;
      const fields = [];
      if (hero.title) fields.push({ key: 'title', value: hero.title });
      if (hero.subtitle) fields.push({ key: 'subtitle', value: hero.subtitle });
      if (hero.ctaPrimaryText) fields.push({ key: 'ctaPrimaryText', value: hero.ctaPrimaryText });
      if (hero.ctaSecondaryText) fields.push({ key: 'ctaSecondaryText', value: hero.ctaSecondaryText });

      if (fields.length > 0) {
        hero.translations = await translateFields(fields, SUPPORTED_LANGUAGES);
      }
    }

    // Translate Features Section
    if (data.featuresSection && Array.isArray(data.featuresSection)) {
      for (const feature of data.featuresSection) {
        const fields = [];
        if (feature.title) fields.push({ key: 'title', value: feature.title });
        if (feature.description) fields.push({ key: 'description', value: feature.description });

        if (fields.length > 0) {
          feature.translations = await translateFields(fields, SUPPORTED_LANGUAGES);
        }
      }
    }

    // Translate CTA Section
    if (data.ctaSection) {
      const cta = data.ctaSection;
      const fields = [];
      if (cta.title) fields.push({ key: 'title', value: cta.title });
      if (cta.description) fields.push({ key: 'description', value: cta.description });
      if (cta.buttonText) fields.push({ key: 'buttonText', value: cta.buttonText });

      if (fields.length > 0) {
        cta.translations = await translateFields(fields, SUPPORTED_LANGUAGES);
      }
    }

    return data;
  } catch (error) {
    logger.error('Site settings auto-translation failed:', error);
    return data;
  }
}

