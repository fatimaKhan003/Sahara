import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { getVoiceReminderLanguage } from "../context/SettingsContext";
import i18n from "../i18n";

export function speakMedication(name, dose) {
  const language = getVoiceReminderLanguage() || "en";
  let speechLang = "en-US";
  let text = "";

  if (language === "ur") {
    if (Platform.OS === "ios") {
      speechLang = "hi-IN";
      text = i18n.t("medication.voiceReminderTextHindi", {
        name,
        dose: dose || "",
      });
    } else {
      speechLang = "ur-PK";
      text = i18n.t("medication.voiceReminderText", { name, dose: dose || "" });
    }
  } else {
    speechLang = "en-US";
    text = i18n.t("medication.voiceReminderText", { name, dose: dose || "" });
  }

  Speech.speak(text, {
    language: speechLang,
    pitch: 1.0,
    rate: 0.9,
  });
}
