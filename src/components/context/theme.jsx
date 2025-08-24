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
  // Hold computed CSS for the generated tint/palette so we can merge with custom CSS
  let [paletteCss, setPaletteCss] = useState('');
  // Centralize theme tint and scheme in provider so palette recomputes on change
  let [themeTint, setThemeTint] = useState(ls.get('theme_tint') || 'soft');
  let [themeScheme, setThemeScheme] = useState(ls.get('theme_scheme') || 'dark');

  // Helper: remove inline CSS custom properties to avoid overriding stylesheet rules
  const clearInlineVars = (vars) => {
    try {
      const roots = [document.documentElement, document.body].filter(Boolean);
      if (Array.isArray(vars) && vars.length > 0) {
        for (const el of roots) {
          for (const name of vars) {
            el.style.removeProperty(name);
          }
        }
      } else {
        // Fallback: remove any inline --* vars if we don't know the exact list
        for (const el of roots) {
          const style = el.style;
          // CSSStyleDeclaration isn't directly iterable, copy property names first
          const names = [];
          for (let i = 0; i < style.length; i++) {
            const prop = style.item(i);
            if (prop && prop.startsWith('--')) names.push(prop);
          }
          for (const name of names) el.style.removeProperty(name);
        }
      }
    } catch {}
  };

  // Ensure there's a single style element that always contains the merged CSS: palette + custom overrides
  useEffect(() => {
    if (!mounted) return;
    try {
      let styleEl = document.getElementById('custom-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-css';
        document.head.appendChild(styleEl);
      }
      // Merge palette first (base), then custom CSS (overrides)
      const merged = [paletteCss, customCss].filter(Boolean).join('\n\n');
      styleEl.textContent = merged;
      // Ensure this style tag is the last in <head> so it wins CSS order
      if (styleEl.parentNode === document.head && styleEl !== document.head.lastChild) {
        document.head.appendChild(styleEl);
      }

      // Persist only the user-provided custom CSS
      if (customCss && customCss !== '') {
        ls.set('custom_css', customCss);
      } else {
        ls.remove('custom_css');
      }
    } catch { }
  }, [customCss, paletteCss, mounted]);

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

  // Persist and reflect scheme/tint changes
  useEffect(() => {
    if (!mounted) return;
    try {
      ls.set('theme_tint', themeTint);
    } catch {}
  }, [themeTint, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      ls.set('theme_scheme', themeScheme);
      // Toggle scheme classes for live preview
      let current = themeScheme === 'dark' ? 'dark' : 'light';
      let other = themeScheme === 'dark' ? 'light' : 'dark';
      document.body.classList.add(current);
      document.body.classList.remove(other);
    } catch {}
  }, [themeScheme, mounted]);

  useEffect(() => {
    if (!mounted) return;

    document.body.classList.add(themeScheme || 'dark')

  if (customHex) {
      ls.set('theme_hex', customHex);
      let palette;
      switch (themeTint) {
        case "soft":
          palette = generateMaterialYouPalette(customHex, themeScheme);
          break;

        case "hard":
          palette = generateTintPalette(customHex, null, themeScheme);
          break;

        case "hard_a":
          palette = generateTintPalette(customHex, JSON.parse(ls.get('theme_control')), themeScheme);
          break;

        default:
          palette = generateMaterialYouPalette(customHex, themeScheme);
          setThemeTint('soft');
          break;
      }

      try {
        // Ensure no previous inline vars override stylesheet-defined ones
        const paletteVarNames = Object.keys(palette || {});
        clearInlineVars(paletteVarNames);

        // Build CSS variables block applied to :root and body so all descendants inherit
        const vars = Object.entries(palette)
          .map(([cssVar, value]) => `${cssVar}: ${value};`)
          .join('\n');
        setPaletteCss(`:root, body {\n${vars}\n}`);
      } catch {
        setPaletteCss('');
      }
    } else {
      ls.remove('theme_hex');
      // Remove any lingering inline vars so custom CSS can still apply
      clearInlineVars();
      setPaletteCss('');
    }
  }, [customHex, themeTint, themeScheme, mounted]);

  return (
    <ThemeContext.Provider value={{
      sidebarRightSide,
      setSidebarRightSide,
      customCss,
      setCustomCss,
  // Expose theme controls
  customHex,
  setCustomHex,
  themeTint,
  setThemeTint,
  themeScheme,
  setThemeScheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};