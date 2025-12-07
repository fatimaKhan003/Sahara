import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ur from './locales/ur.json';

const LANGUAGE_KEY = '@sahara_language';

// Function to get saved language or default
export const getSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
    // Get device language - default to 'en' if anything fails
    let deviceLanguage = 'en';
    
    try {
      let localeString = null;
      
      // Method 1: Try getLocales() function if it exists
      if (typeof Localization.getLocales === 'function') {
        try {
          const locales = Localization.getLocales();
          if (Array.isArray(locales) && locales.length > 0 && locales[0]) {
            localeString = locales[0].languageCode || locales[0].languageTag || null;
          }
        } catch (e) {
          // getLocales() failed, try next method
        }
      }
      
      // Method 2: Try locale property (if getLocales didn't work)
      if (!localeString && Localization.locale && typeof Localization.locale === 'string') {
        localeString = Localization.locale;
      }
      
      // Extract language code from locale string
      if (localeString && typeof localeString === 'string') {
        // Split by '-' or '_' and take first part
        const parts = localeString.split(/[-_]/);
        if (parts && parts.length > 0 && parts[0]) {
          deviceLanguage = parts[0].toLowerCase();
        }
      }
    } catch (localeError) {
      // If anything fails, default to 'en'
      console.warn('Could not get device locale, defaulting to English');
    }
    
    // Only return 'ur' if device language is exactly 'ur', otherwise default to 'en'
    return deviceLanguage === 'ur' ? 'ur' : 'en';
  } catch (error) {
    console.error('Error getting saved language:', error);
    return 'en';
  }
};

// Initialize i18n synchronously first, then update language
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    lng: 'en', // Default, will be updated
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Load saved language after initialization
getSavedLanguage().then((savedLanguage) => {
  i18n.changeLanguage(savedLanguage);
});

// Function to change language
export const changeLanguage = async (languageCode) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Function to get current language (synchronous)
export const getCurrentLanguage = () => {
  return i18n.language;
};

// Function to check if language changed (useful for debugging)
export const onLanguageChanged = (callback) => {
  i18n.on('languageChanged', callback);
  // Return cleanup function
  return () => {
    i18n.off('languageChanged', callback);
  };
};

export default i18n;

