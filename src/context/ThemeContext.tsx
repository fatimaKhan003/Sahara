import React, { createContext, useState } from "react";
import { lightTheme, darkTheme } from "../themes";

export const ThemeContext = createContext<any>({
  theme: "light",
  toggleTheme: () => {},
  currentColors: lightTheme,
});

export const ThemeProvider = ({ children }: any) => {
  const [theme, setTheme] = useState("light");

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const applyTheme = (newTheme: string) => {
    setTheme(newTheme);
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
