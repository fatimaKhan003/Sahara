import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

let _voiceReminderEnabled = false; // global cache
export function getVoiceReminderEnabled() {
  return _voiceReminderEnabled;
}

const VOICE_REMINDER_KEY = "voiceReminderEnabled";

type SettingsContextType = {
  voiceReminderEnabled: boolean;
  toggleVoiceReminder: (value: boolean) => void;
};

export const SettingsContext = createContext<SettingsContextType>({
  voiceReminderEnabled: false,
  toggleVoiceReminder: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [voiceReminderEnabled, setVoiceReminderEnabled] = useState(false);

  // Load the setting from AsyncStorage on mount
  useEffect(() => {
    const loadSetting = async () => {
      const stored = await AsyncStorage.getItem(VOICE_REMINDER_KEY);
      const value = stored === "true";
      setVoiceReminderEnabled(value);
      _voiceReminderEnabled = value;
    };
    loadSetting();
  }, []);

  // Toggle function
  const toggleVoiceReminder = async (value: boolean) => {
    setVoiceReminderEnabled(value);
    _voiceReminderEnabled = value;
    await AsyncStorage.setItem(VOICE_REMINDER_KEY, value.toString());
  };

  return (
    <SettingsContext.Provider
      value={{ voiceReminderEnabled, toggleVoiceReminder }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
