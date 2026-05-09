import React, { createContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme } from "../themes";
import EventBus from "../utils/EventBus";

const THEME_KEY = "appTheme";
const userThemeKey = (userId: string) => `${THEME_KEY}_${userId}`;

const getStoredUserId = async () => {
  try {
    const rawUser = await AsyncStorage.getItem("user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return parsed?._id || null;
  } catch {
    return null;
  }
};

export const ThemeContext = createContext<any>({
  theme: "light",
  toggleTheme: () => {},
  applyTheme: (_newTheme: string) => {},
  currentColors: lightTheme,
});

export const ThemeProvider = ({ children }: any) => {
  const [theme, setTheme] = useState("light");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const loadThemeForCurrentUser = async () => {
    const userId = await getStoredUserId();
    setActiveUserId(userId);

    try {
      if (userId) {
        const userTheme = await AsyncStorage.getItem(userThemeKey(userId));
        if (userTheme === "dark" || userTheme === "light") {
          setTheme(userTheme);
          return;
        }
      }

      const fallbackTheme = await AsyncStorage.getItem(THEME_KEY);
      if (fallbackTheme === "dark" || fallbackTheme === "light") {
        setTheme(fallbackTheme);
      } else {
        setTheme("light");
      }
    } catch {
      setTheme("light");
    }
  };

  useEffect(() => {
    loadThemeForCurrentUser();

    const onUserUpdated = async (updatedUser: any) => {
      const nextUserId = updatedUser?._id || null;
      setActiveUserId(nextUserId);
      await loadThemeForCurrentUser();
    };

    EventBus.on("userUpdated", onUserUpdated);
    return () => EventBus.off("userUpdated", onUserUpdated);
  }, []);

  const persistTheme = async (selectedTheme: string) => {
    try {
      const userId = activeUserId ?? (await getStoredUserId());
      if (userId) {
        await AsyncStorage.setItem(userThemeKey(userId), selectedTheme);
      }
      await AsyncStorage.setItem(THEME_KEY, selectedTheme);
    } catch {}
  };

  const toggleTheme = async () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    await persistTheme(nextTheme);
  };

  const applyTheme = async (newTheme: string) => {
    if (newTheme !== "light" && newTheme !== "dark") return;
    setTheme(newTheme);
    await persistTheme(newTheme);
  };

  const currentColors = theme === "light" ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, applyTheme, currentColors }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
