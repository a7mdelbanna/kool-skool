import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem('userLanguage') || 'en',
    fallbackLng: 'en',
    debug: false,

    ns: ['common', 'dashboard', 'subscription', 'navigation'],
    defaultNS: 'common',

    backend: {
      loadPath: '/src/i18n/locales/{{lng}}/{{ns}}.json',
    },

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'userLanguage',
    },
  });

export default i18n;