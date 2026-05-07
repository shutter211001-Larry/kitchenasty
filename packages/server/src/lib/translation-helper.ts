import { translateContent, translateFields } from './ai.js';
import logger from './logger.js';

export const SUPPORTED_LANGUAGES = ['en', 'th', 'id', 'vi', 'tl', 'es', 'fr', 'de', 'it', 'pt'];

/**
 * Automatically translates a menu item's fields if they are missing translations.
 */
export async function autoTranslateMenuItem(data: any, existingData?: any) {
  try {
    const fieldsToTranslate = [];

    const shouldTranslate = (field: string, translationsField: string) => {
      if (!data[field]) return false;
      // If we have an existing item and the field changed, we should re-translate
      if (existingData && data[field] !== existingData[field]) {
        logger.info(`[DEBUG] Field ${field} changed from "${existingData[field]}" to "${data[field]}". Will re-translate.`);
        return true;
      }
      // Or if there are missing translations
      if (!data[translationsField] || Object.keys(data[translationsField]).length < SUPPORTED_LANGUAGES.length) {
        logger.info(`[DEBUG] Field ${field} missing translations. Will re-translate.`);
        return true;
      }
      logger.info(`[DEBUG] Field ${field} skipped translation (no changes and translations are full).`);
      return false;
    };

    if (shouldTranslate('name', 'nameTranslations')) {
      fieldsToTranslate.push({ key: 'name', value: data.name });
    }

    if (shouldTranslate('description', 'descriptionTranslations')) {
      fieldsToTranslate.push({ key: 'description', value: data.description });
    }

    if (shouldTranslate('unit', 'unitTranslations')) {
      fieldsToTranslate.push({ key: 'unit', value: data.unit });
    }

    if (fieldsToTranslate.length === 0) return data;

    logger.info({ fieldsCount: fieldsToTranslate.length }, `Auto-translating menu item: ${data.name}`);
    const translations = await translateFields(fieldsToTranslate, SUPPORTED_LANGUAGES);
    logger.debug({ translationsReceived: Object.keys(translations) }, 'AI translation received');
    logger.info(`[DEBUG] Received translations object from AI: ${JSON.stringify(translations)}`);

    if (translations.name) {
      data.nameTranslations = { ...(data.nameTranslations || {}), ...translations.name };
      logger.info(`[DEBUG] Final nameTranslations: ${JSON.stringify(data.nameTranslations)}`);
    }
    if (translations.description) {
      data.descriptionTranslations = { ...(data.descriptionTranslations || {}), ...translations.description };
    }
    if (translations.unit) {
      data.unitTranslations = { ...(data.unitTranslations || {}), ...translations.unit };
    }

    return data;
  } catch (error) {
    logger.error(error as any, 'Auto-translation helper failed:');
    return data;
  }
}

/**
 * Automatically translates a category's fields.
 */
export async function autoTranslateCategory(data: any, existingData?: any) {
  try {
    const fieldsToTranslate = [];

    const shouldTranslate = (field: string, translationsField: string) => {
      if (!data[field]) return false;
      if (existingData && data[field] !== existingData[field]) {
        return true;
      }
      if (!data[translationsField] || Object.keys(data[translationsField]).length < SUPPORTED_LANGUAGES.length) {
        return true;
      }
      return false;
    };

    if (shouldTranslate('name', 'nameTranslations')) {
      fieldsToTranslate.push({ key: 'name', value: data.name });
    }

    if (shouldTranslate('description', 'descriptionTranslations')) {
      fieldsToTranslate.push({ key: 'description', value: data.description });
    }

    if (fieldsToTranslate.length === 0) return data;

    logger.info({ fieldsCount: fieldsToTranslate.length }, `Auto-translating category: ${data.name}`);
    const translations = await translateFields(fieldsToTranslate, SUPPORTED_LANGUAGES);
    logger.debug({ translationsReceived: Object.keys(translations) }, 'AI translation received for category');

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
    logger.error(error as any, 'Site settings auto-translation failed:');
    return data;
  }
}

