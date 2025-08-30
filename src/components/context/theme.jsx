"use client";

// Package Imports
import { useState, useEffect, createContext, useContext } from "react";

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
  let [customHex, setCustomHex] = useState("");
  let [mounted, setMounted] = useState(false);

  let [sidebarRightSide, setSidebarRightSide] = useState(
    ls.get("theme_sidebar") === "right",
  );
  let [hideWindowControls, setHideWindowControls] = useState(
    ls.get("layout_hide_window_controls") === "true",
  );
  let [customCss, setCustomCss] = useState("");
  let [paletteCss, setPaletteCss] = useState("");
  let [themeTint, setThemeTint] = useState(ls.get("theme_tint") || "soft");
  let [themeScheme, setThemeScheme] = useState(
    ls.get("theme_scheme") || "dark",
  );

  useEffect(() => {
    try {
      if (hideWindowControls) {
        ls.set("layout_hide_window_controls", "true");
      } else {
        ls.remove("layout_hide_window_controls");
      }
    } catch {}
  }, [hideWindowControls]);

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
        for (const el of roots) {
          const style = el.style;
          const names = [];
          for (let i = 0; i < style.length; i++) {
            const prop = style.item(i);
            if (prop && prop.startsWith("--")) names.push(prop);
          }
          for (const name of names) el.style.removeProperty(name);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!mounted) return;
    try {
      let styleEl = document.getElementById("custom-css");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "custom-css";
        document.head.appendChild(styleEl);
      }

      const merged = [paletteCss, customCss].filter(Boolean).join("\n\n");
      styleEl.textContent = merged;

      if (
        styleEl.parentNode === document.head &&
        styleEl !== document.head.lastChild
      ) {
        document.head.appendChild(styleEl);
      }

      if (customCss && customCss !== "") {
        ls.set("custom_css", customCss);
      } else {
        ls.remove("custom_css");
      }
    } catch {}
  }, [customCss, paletteCss, mounted]);

  // Sidebar
  useEffect(() => {
    try {
      if (sidebarRightSide) {
        ls.set("theme_sidebar", "right");
      } else {
        ls.set("theme_sidebar", "left");
      }
    } catch {}
  }, [sidebarRightSide]);

  // Initial load
  useEffect(() => {
    setMounted(true);

    try {
      const storedHex = ls.get("theme_hex");
      if (storedHex) setCustomHex(storedHex);

      const storedCss = ls.get("custom_css");
      if (typeof storedCss === "string") setCustomCss(storedCss);
    } catch {}
  }, []);

  // Tint
  useEffect(() => {
    if (!mounted) return;
    try {
      ls.set("theme_tint", themeTint);
    } catch {}
  }, [themeTint, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      ls.set("theme_scheme", themeScheme);
      const current = themeScheme === "dark" ? "dark" : "light";
      const other = themeScheme === "dark" ? "light" : "dark";
      document.body.classList.add(current);
      document.body.classList.remove(other);
    } catch {}
  }, [themeScheme, mounted]);

  useEffect(() => {
    if (!mounted) return;

    try {
      document.body.classList.add(themeScheme || "dark");
    } catch {}

    if (customHex) {
      try {
        ls.set("theme_hex", customHex);

        let palette;
        switch (themeTint) {
          case "soft":
            palette = generateMaterialYouPalette(customHex, themeScheme);
            break;
          case "hard":
            palette = generateTintPalette(customHex, null, themeScheme);
            break;
          case "hard_a": {
            let control = null;
            try {
              control = JSON.parse(ls.get("theme_control"));
            } catch {}
            palette = generateTintPalette(customHex, control, themeScheme);
            break;
          }
          default:
            palette = generateMaterialYouPalette(customHex, themeScheme);
            setThemeTint("soft");
            break;
        }

        const paletteVarNames = Object.keys(palette || {});
        clearInlineVars(paletteVarNames);

        const varLines = Object.entries(palette)
          .map(([cssVar, value]) => `${cssVar}: ${value};`)
          .join("\n");

        const current = themeScheme === "dark" ? "dark" : "light";
        const other = current === "dark" ? "light" : "dark";

        const css = [
          `:root, html, body {\n${varLines}\n}`,
          `html.${current}, body.${current} {\n${varLines}\n}`,
          `html.${other}, body.${other} {\n${varLines}\n}`,
        ].join("\n\n");

        setPaletteCss(css);
      } catch {
        setPaletteCss("");
      }
    } else {
      try {
        ls.remove("theme_hex");
      } catch {}
      clearInlineVars();
      setPaletteCss("");
    }
  }, [customHex, themeTint, themeScheme, mounted]);

  return (
    <ThemeContext.Provider
      value={{
        sidebarRightSide,
        setSidebarRightSide,
        hideWindowControls,
        setHideWindowControls,
        customCss,
        setCustomCss,
        customHex,
        setCustomHex,
        themeTint,
        setThemeTint,
        themeScheme,
        setThemeScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
