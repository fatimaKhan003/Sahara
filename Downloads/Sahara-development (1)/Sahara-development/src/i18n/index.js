import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ur from './locales/ur.json';

const LANGUAGE_KEY = '@sahara_language';

export const getSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
    let deviceLanguage = 'en';
    
    try {
      let localeString = null;
      
      // Method 1: getLocales() function 
      if (typeof Localization.getLocales === 'function') {
        try {
          const locales = Localization.getLocales();
          if (Array.isArray(locales) && locales.length > 0 && locales[0]) {
            localeString = locales[0].languageCode || locales[0].languageTag || null;
          }
        } catch (e) {
          
        }
      }
      
      // Method 2: locale property 
      if (!localeString && Localization.locale && typeof Localization.locale === 'string') {
        localeString = Localization.locale;
      }
      

      if (localeString && typeof localeString === 'string') {

        const parts = localeString.split(/[-_]/);
        if (parts && parts.length > 0 && parts[0]) {
          deviceLanguage = parts[0].toLowerCase();
        }
      }
    } catch (localeError) {
      console.warn('Could not get device locale, defaulting to English');
    }
    
    
    return deviceLanguage === 'ur' ? 'ur' : 'en';
  } catch (error) {
    console.error('Error getting saved language:', error);
    return 'en';
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    lng: 'en', 
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });


getSavedLanguage().then((savedLanguage) => {
  i18n.changeLanguage(savedLanguage);
});


export const changeLanguage = async (languageCode) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const onLanguageChanged = (callback) => {
  i18n.on('languageChanged', callback);
  return () => {
    i18n.off('languageChanged', callback);
  };
};

export default i18n;

