"use client";

// Package Imports
import {
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";

// Lib Imports
import { generateTintPalette, generateMaterialYouPalette } from "@/lib/theme";
import ls from "@/lib/localStorageManager";

// Main
let ThemeContext = createContext(null);

// Use Context Function
export function useThemeContext() {
  let context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Provider
export function ThemeProvider({ children }) {
  let [customHex, setCustomHex] = useState('');
  let [mounted, setMounted] = useState(false);
  let [sidebarRightSide, setSidebarRightSide] = useState(ls.get("theme_sidebar") === "right")

  useEffect(() => {
    if (sidebarRightSide) {
      ls.set("theme_sidebar", "right")
    } else {
      ls.set("theme_sidebar", "left")
    }
  }, [sidebarRightSide])

  useEffect(() => {
    setMounted(true);
    let storedHex = ls.get('theme_hex');
    if (storedHex) {
      setCustomHex(storedHex);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (customHex) {
      ls.set('theme_hex', customHex);
      let palette;
      switch (ls.get('theme_tint')) {
        case "soft":
          palette = generateMaterialYouPalette(customHex, ls.get('theme_scheme'));
          break;

        case "hard":
          palette = generateTintPalette(customHex, null, ls.get('theme_scheme'));
          break;

        case "hard_a":
          palette = generateTintPalette(customHex, JSON.parse(ls.get('theme_control')), ls.get('theme_scheme'));
          break;

        default:
          palette = generateMaterialYouPalette(customHex, ls.get('theme_scheme'));
          ls.set('theme_tint', 'soft')
          break;
      }

      for (let [cssVar, value] of Object.entries(palette)) {
        document.documentElement.style.setProperty(cssVar, value);
      }
    } else {
      ls.remove('theme_hex');
    }
  }, [customHex, mounted]);

  return (
    <ThemeContext.Provider value={{
      sidebarRightSide,
      setSidebarRightSide,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};