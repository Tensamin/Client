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
  let [customCss, setCustomCss] = useState('');

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
    // Load persisted Custom CSS
    let storedCss = ls.get('custom_css');
    if (typeof storedCss === 'string') {
      setCustomCss(storedCss);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    document.body.classList.add(ls.get('theme_scheme') || 'dark')

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

      // Apply custom palette on both html and body so it overrides .dark/.light variable scopes
      for (let [cssVar, value] of Object.entries(palette)) {
        try {
          document.documentElement.style.setProperty(cssVar, value);
          document.body.style.setProperty(cssVar, value);
        } catch {}
      }
    } else {
      ls.remove('theme_hex');
    }
  }, [customHex, mounted]);

  // Inject Custom CSS into a dedicated <style id="custom-css"> tag and persist
  useEffect(() => {
    if (!mounted) return;
    try {
      let styleEl = document.getElementById('custom-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = customCss || '';
      if (customCss && customCss !== '') {
        ls.set('custom_css', customCss);
      } else {
        ls.remove('custom_css');
      }
    } catch {}
  }, [customCss, mounted]);

  return (
    <ThemeContext.Provider value={{
      sidebarRightSide,
      setSidebarRightSide,
  customCss,
  setCustomCss,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};