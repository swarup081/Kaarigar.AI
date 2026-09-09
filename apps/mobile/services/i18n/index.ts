// ============================================
// Kaarigar — i18n Setup
// Supports: Hindi (hi), English (en), Tamil (ta), Bengali (bn)
// ============================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';
import bn from './bn.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta },
    bn: { translation: bn },
  },
  lng: 'hi', // Default to Hindi — our primary user base
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
