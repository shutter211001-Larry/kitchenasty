import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import zhTW from './locales/zh-TW.json';
import th from './locales/th.json';
import id from './locales/id.json';
import vi from './locales/vi.json';
import tl from './locales/tl.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'zh-TW', name: '繁體中文', flag: '<svg viewBox="0 0 24 24" width="18" height="18" style="transform: scale(1.2)"><path fill="#2c9b3f" d="M12,2C10.89,2 10,2.89 10,4C10,5.11 10.89,6 12,6C13.11,6 14,5.11 14,4C14,2.89 13.11,2 12,2M21,12C21,12 18,10 15,10C14.16,10 13.4,10.15 12.75,10.4C12.35,9.6 11.5,9 10.5,9C9.12,9 8,10.12 8,11.5C8,11.83 8.07,12.14 8.2,12.41C7.16,12.78 6,13.78 6,15C6,16.11 6.89,17 8,17C8.25,17 8.5,16.95 8.71,16.85C9.35,17.55 10.3,18 11.5,18C13.5,18 16,16 16,14C16,13.75 16,13.5 15.95,13.29C17.05,13.35 18.25,13.65 19.3,14.05C20.4,14.45 21,15 21,15V12Z" /></svg>' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const savedLanguage = localStorage.getItem('language') || 'zh-TW';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    pt: { translation: pt },
    'zh-TW': { translation: zhTW },
    th: { translation: th },
    id: { translation: id },
    vi: { translation: vi },
    tl: { translation: tl },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.lang = lng;
});

export default i18n;
