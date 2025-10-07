import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { useColorScheme } from "react-native";

export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    inputBackground: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: "#007AFF",
    background: "#F8F9FA",
    card: "#FFFFFF",
    text: "#000000",
    textSecondary: "#8E8E93",
    border: "#E1E8ED",
    inputBackground: "#F0F0F0",
    error: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
    info: "#5856D6",
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: "#0A84FF",
    background: "#000000",
    card: "#1C1C1E",
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    border: "#2C2C2E",
    inputBackground: "#1C1C1E",
    error: "#FF453A",
    success: "#32D74B",
    warning: "#FF9F0A",
    info: "#5E5CE6",
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(
    colorScheme === "dark" ? darkTheme : lightTheme
  );

  useEffect(() => {
    setTheme(colorScheme === "dark" ? darkTheme : lightTheme);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme.dark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
