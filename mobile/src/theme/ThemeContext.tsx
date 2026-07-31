import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import SecureStore from "../services/storage";
import { lightTheme, darkTheme, Theme } from "./index";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColor = useColorScheme();
  const [isDark, setIsDark] = useState(systemColor === "dark");

  useEffect(() => {
    SecureStore.getItemAsync("theme_mode").then((v) => {
      if (v === "dark") setIsDark(true);
      else if (v === "light") setIsDark(false);
      else setIsDark(systemColor === "dark");
    });
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    SecureStore.setItemAsync("theme_mode", next ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
