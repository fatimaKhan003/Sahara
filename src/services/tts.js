import * as Speech from "expo-speech";

export function speakMedication(name, dose) {
  const text = `Reminder. Take ${name}, dose ${dose}`;

  Speech.speak(text, {
    language: "en-US",
    pitch: 1.0,
    rate: 0.9,
  });
}
