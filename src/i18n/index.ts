import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enSubscription from './locales/en/subscription.json';
import enNavigation from './locales/en/navigation.json';

import ruCommon from './locales/ru/common.json';
import ruDashboard from './locales/ru/dashboard.json';
import ruSubscription from './locales/ru/subscription.json';
import ruNavigation from './locales/ru/navigation.json';

const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    subscription: enSubscription,
    navigation: enNavigation,
  },
  ru: {
    common: ruCommon,
    dashboard: ruDashboard,
    subscription: ruSubscription,
    navigation: ruNavigation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('userLanguage') || 'en',
    fallbackLng: 'en',
    debug: false,

    ns: ['common', 'dashboard', 'subscription', 'navigation'],
    defaultNS: 'common',

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