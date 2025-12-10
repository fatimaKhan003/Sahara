// context/ThemeContext.tsx
import React, { createContext, useState } from "react";
import { lightTheme, darkTheme } from "../themes";

export const ThemeContext = createContext<any>({
  theme: "light",
  toggleTheme: () => {},
  currentColors: lightTheme,
});

export const ThemeProvider = ({ children }: any) => {
  const [theme, setTheme] = useState("light");

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  const currentColors = theme === "light" ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, currentColors }}>
      {children}
    </ThemeContext.Provider>
  );
};
