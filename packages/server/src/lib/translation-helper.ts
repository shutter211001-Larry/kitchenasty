import { translateContent, translateFields } from './ai.js';
import logger from './logger.js';

export const SUPPORTED_LANGUAGES = ['en', 'th', 'id', 'vi', 'tl', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko'];

/**
 * Automatically translates a menu item's fields if they are missing translations.
 */
export async function autoTranslateMenuItem(data: any, existingData?: any) {
  try {
    const fieldsToTranslate: { key: string; value: string }[] = [];

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
    const fieldsToTranslate: { key: string; value: string }[] = [];

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
export async function autoTranslateSiteSettings(data: any, existingData?: any) {
  try {
    // Translate Hero Section
    if (data.heroSection) {
      const hero = data.heroSection;
      const existingHero = existingData?.heroSection || {};
      hero.translations = existingHero.translations || {};

      const fields: { key: string; value: string }[] = [];
      const checkAndPush = (key: string) => {
        if (!hero[key]) return;
        if (existingData && hero[key] === existingHero[key] && hero.translations[key] && Object.keys(hero.translations[key]).length >= SUPPORTED_LANGUAGES.length) return;
        fields.push({ key, value: hero[key] });
      };

      checkAndPush('title');
      checkAndPush('subtitle');
      checkAndPush('ctaPrimaryText');
      checkAndPush('ctaSecondaryText');

      if (fields.length > 0) {
        const newTranslations = await translateFields(fields, SUPPORTED_LANGUAGES);
        hero.translations = { ...hero.translations, ...newTranslations };
      }
    }

    // Translate Features Section
    if (data.featuresSection && Array.isArray(data.featuresSection)) {
      const existingFeatures = Array.isArray(existingData?.featuresSection) ? existingData.featuresSection : [];
      
      for (let i = 0; i < data.featuresSection.length; i++) {
        const feature = data.featuresSection[i];
        const existingFeature = existingFeatures[i] || {};
        feature.translations = existingFeature.translations || {};

        const fields: { key: string; value: string }[] = [];
        const checkAndPush = (key: string) => {
          if (!feature[key]) return;
          if (existingData && feature[key] === existingFeature[key] && feature.translations[key] && Object.keys(feature.translations[key]).length >= SUPPORTED_LANGUAGES.length) return;
          fields.push({ key, value: feature[key] });
        };

        checkAndPush('title');
        checkAndPush('description');

        if (fields.length > 0) {
          const newTranslations = await translateFields(fields, SUPPORTED_LANGUAGES);
          feature.translations = { ...feature.translations, ...newTranslations };
        }
      }
    }

    // Translate CTA Section
    if (data.ctaSection) {
      const cta = data.ctaSection;
      const existingCta = existingData?.ctaSection || {};
      cta.translations = existingCta.translations || {};

      const fields: { key: string; value: string }[] = [];
      const checkAndPush = (key: string) => {
        if (!cta[key]) return;
        if (existingData && cta[key] === existingCta[key] && cta.translations[key] && Object.keys(cta.translations[key]).length >= SUPPORTED_LANGUAGES.length) return;
        fields.push({ key, value: cta[key] });
      };

      checkAndPush('title');
      checkAndPush('description');
      checkAndPush('buttonText');

      if (fields.length > 0) {
        const newTranslations = await translateFields(fields, SUPPORTED_LANGUAGES);
        cta.translations = { ...cta.translations, ...newTranslations };
      }
    }

    return data;
  } catch (error) {
    logger.error(error as any, 'Site settings auto-translation failed:');
    return data;
  }
}

/**
 * Automatically translates an allergen's fields.
 */
export async function autoTranslateAllergen(data: any, existingData?: any) {
  try {
    const fieldsToTranslate: { key: string; value: string }[] = [];

    const shouldTranslate = (field: string, translationsField: string) => {
      if (!data[field]) return false;
      if (existingData && data[field] !== existingData[field]) return true;
      if (!data[translationsField] || Object.keys(data[translationsField]).length < SUPPORTED_LANGUAGES.length) return true;
      return false;
    };

    if (shouldTranslate('name', 'nameTranslations')) {
      fieldsToTranslate.push({ key: 'name', value: data.name });
    }

    if (fieldsToTranslate.length === 0) return data;

    logger.info({ fieldsCount: fieldsToTranslate.length }, `Auto-translating allergen: ${data.name}`);
    const translations = await translateFields(fieldsToTranslate, SUPPORTED_LANGUAGES);

    if (translations.name) {
      data.nameTranslations = { ...(data.nameTranslations || {}), ...translations.name };
    }

    return data;
  } catch (error) {
    return data;
  }
}

/**
 * Automatically translates a mealtime's fields.
 */
export async function autoTranslateMealtime(data: any, existingData?: any) {
  try {
    const fieldsToTranslate: { key: string; value: string }[] = [];

    const shouldTranslate = (field: string, translationsField: string) => {
      if (!data[field]) return false;
      if (existingData && data[field] !== existingData[field]) return true;
      if (!data[translationsField] || Object.keys(data[translationsField]).length < SUPPORTED_LANGUAGES.length) return true;
      return false;
    };

    if (shouldTranslate('name', 'nameTranslations')) {
      fieldsToTranslate.push({ key: 'name', value: data.name });
    }

    if (fieldsToTranslate.length === 0) return data;

    logger.info({ fieldsCount: fieldsToTranslate.length }, `Auto-translating mealtime: ${data.name}`);
    const translations = await translateFields(fieldsToTranslate, SUPPORTED_LANGUAGES);

    if (translations.name) {
      data.nameTranslations = { ...(data.nameTranslations || {}), ...translations.name };
    }

    return data;
  } catch (error) {
    return data;
  }
}

/**
 * Automatically translates a dietary preference's fields.
 */
export async function autoTranslateDietaryPreference(data: any, existingData?: any) {
  try {
    const fieldsToTranslate: { key: string; value: string }[] = [];

    const shouldTranslate = (field: string, translationsField: string) => {
      if (!data[field]) return false;
      if (existingData && data[field] !== existingData[field]) return true;
      if (!data[translationsField] || Object.keys(data[translationsField]).length < SUPPORTED_LANGUAGES.length) return true;
      return false;
    };

    if (shouldTranslate('name', 'nameTranslations')) {
      fieldsToTranslate.push({ key: 'name', value: data.name });
    }

    if (fieldsToTranslate.length === 0) return data;

    logger.info({ fieldsCount: fieldsToTranslate.length }, `Auto-translating dietary preference: ${data.name}`);
    const translations = await translateFields(fieldsToTranslate, SUPPORTED_LANGUAGES);

    if (translations.name) {
      data.nameTranslations = { ...(data.nameTranslations || {}), ...translations.name };
    }

    return data;
  } catch (error) {
    return data;
  }
}
