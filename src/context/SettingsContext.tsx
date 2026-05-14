import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

let _voiceReminderEnabled = false;
let _voiceReminderLanguage = "en"; // global cache for TTS service

export function getVoiceReminderEnabled() {
  return _voiceReminderEnabled;
}

export function getVoiceReminderLanguage() {
  return _voiceReminderLanguage;
}

const VOICE_REMINDER_KEY = "voiceReminderEnabled";
const VOICE_LANGUAGE_KEY = "voiceReminderLanguage";

type SettingsContextType = {
  voiceReminderEnabled: boolean;
  toggleVoiceReminder: (value: boolean) => void;
  voiceReminderLanguage: string;
  setVoiceReminderLanguage: (lang: string) => void;
};

export const SettingsContext = createContext<SettingsContextType>({
  voiceReminderEnabled: false,
  toggleVoiceReminder: () => {},
  voiceReminderLanguage: "en",
  setVoiceReminderLanguage: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [voiceReminderEnabled, setVoiceReminderEnabled] = useState(false);
  const [voiceReminderLanguage, setVoiceReminderLanguageState] = useState("en");

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      const storedEnabled = await AsyncStorage.getItem(VOICE_REMINDER_KEY);
      const enabledValue = storedEnabled === "true";
      setVoiceReminderEnabled(enabledValue);
      _voiceReminderEnabled = enabledValue;

      const storedLang = await AsyncStorage.getItem(VOICE_LANGUAGE_KEY);
      const langValue = storedLang || "en";
      setVoiceReminderLanguageState(langValue);
      _voiceReminderLanguage = langValue;
    };
    loadSettings();
  }, []);

  // Toggle voice reminders
  const toggleVoiceReminder = async (value: boolean) => {
    setVoiceReminderEnabled(value);
    _voiceReminderEnabled = value;
    await AsyncStorage.setItem(VOICE_REMINDER_KEY, value.toString());
  };

  // Set voice language
  const setVoiceReminderLanguage = async (lang: string) => {
    setVoiceReminderLanguageState(lang);
    _voiceReminderLanguage = lang;
    await AsyncStorage.setItem(VOICE_LANGUAGE_KEY, lang);
  };

  return (
    <SettingsContext.Provider
      value={{
        voiceReminderEnabled,
        toggleVoiceReminder,
        voiceReminderLanguage,
        setVoiceReminderLanguage,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
