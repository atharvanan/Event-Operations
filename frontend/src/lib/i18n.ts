'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from '../../public/locales/en/common.json';
import hiTranslation from '../../public/locales/hi/common.json';
import mrTranslation from '../../public/locales/mr/common.json';

const resources = {
  en: { common: enTranslation },
  hi: { common: hiTranslation },
  mr: { common: mrTranslation },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: typeof window !== 'undefined' ? localStorage.getItem('eventops_lang') || 'en' : 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
