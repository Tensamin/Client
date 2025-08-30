// Package Imports
import chroma from "chroma-js";
import {
  argbFromHex,
  themeFromSourceColor,
  hexFromArgb,
  Hct,
} from "@material/material-color-utilities";
import { Scheme } from "@material/material-color-utilities";

// Hard Tint
export let THEME_CONTROLS = {
  LIGHTNESS_DISTRIBUTION_EXPONENT: 1.0,

  LIGHT_THEME_BASE_COLORIZATION_STRENGTH: 2,
  LIGHT_THEME_ACCENT_COLORIZATION_STRENGTH: 1.1,
  LIGHT_THEME_GLOBAL_SATURATION_FACTOR: 0.9,
  LIGHT_THEME_PRIMARY_SATURATION_FACTOR: 0.9,
  LIGHT_THEME_HUE_SHIFT_AMOUNT: 0,
  LIGHT_THEME_CONTRAST: 0.85,

  DARK_THEME_BASE_COLORIZATION_STRENGTH: 1,
  DARK_THEME_ACCENT_COLORIZATION_STRENGTH: 1.1,
  DARK_THEME_GLOBAL_SATURATION_FACTOR: 1.2,
  DARK_THEME_PRIMARY_SATURATION_FACTOR: 1.2,
  DARK_THEME_HUE_SHIFT_AMOUNT: 0,
  DARK_THEME_CONTRAST: 5,
};

let LIGHT_THEME_OKLCH_REFS = {
  background: { l: 1, c: 0 },
  foreground: { l: 0, c: 0.03 },
  card: { l: 1, c: 0 },
  card_foreground: { l: 0, c: 0.03 },
  popover: { l: 1, c: 0 },
  popover_foreground: { l: 0, c: 0.03 },
  primary: { l: 0.96, c: 0.01 },
  primary_foreground: { l: 0.08, c: 0.04 },
  secondary: { l: 0.96, c: 0.01 },
  secondary_foreground: { l: 0.08, c: 0.04 },
  muted: { l: 0.96, c: 0.01 },
  muted_foreground: { l: 0.48, c: 0.09 },
  accent: { l: 0.96, c: 0.01 },
  accent_foreground: { l: 0.08, c: 0.04 },
  destructive: { l: 0.51, c: 0.245, h: 27.325 },
  destructive_foreground: { l: 0.98, c: 0 },
  border: { l: 0.9, c: 0.02 },
  input: { l: 0.9, c: 0.02 },
  ring: { l: 0.66, c: 0.08 },
  chart1: { l: 0.59, c: 0.222, h: 41.116 },
  chart2: { l: 0.53, c: 0.118, h: 184.704 },
  chart3: { l: 0.3, c: 0.07, h: 227.392 },
  chart4: { l: 0.8, c: 0.189, h: 84.429 },
  chart5: { l: 0.73, c: 0.188, h: 70.08 },
  sidebar: { l: 0.98, c: 0 },
  sidebar_foreground: { l: 0, c: 0.03 },
  sidebar_primary: { l: 0.08, c: 0.04 },
  sidebar_primary_foreground: { l: 0.98, c: 0 },
  sidebar_accent: { l: 0.96, c: 0.01 },
  sidebar_accent_foreground: { l: 0.08, c: 0.04 },
  sidebar_border: { l: 0.9, c: 0.02 },
  sidebar_ring: { l: 0.66, c: 0.08 },
};

let DARK_THEME_OKLCH_REFS = {
  background: { l: 0.005, c: 0.03 },
  foreground: { l: 1, c: 0 },
  card: { l: 0.017, c: 0.02 },
  card_foreground: { l: 1, c: 0 },
  popover: { l: 0.01, c: 0.03 },
  popover_foreground: { l: 1, c: 0 },
  primary: { l: 0.11, c: 0.03 },
  primary_foreground: { l: 1, c: 0 },
  secondary: { l: 0.11, c: 0.03 },
  secondary_foreground: { l: 1, c: 0 },
  muted: { l: 0.11, c: 0.03 },
  muted_foreground: { l: 0.61, c: 0.08 },
  accent: { l: 0.08, c: 0.03 },
  accent_foreground: { l: 1, c: 0 },
  destructive: { l: 0.2, c: 0.53 },
  destructive_foreground: { l: 0.005, c: 0.03 },
  border: { l: 0.06, c: 0.04, alpha: 0.5 },
  input: { l: 0.08, c: 0.05, alpha: 0.6 },
  ring: { l: 0.5, c: 0.09 },
  chart1: { l: 0.4, c: 0.243, h: 264.376 },
  chart2: { l: 0.68, c: 0.17, h: 162.48 },
  chart3: { l: 0.77, c: 0.188, h: 70.08 },
  chart4: { l: 0.59, c: 0.265, h: 303.9 },
  chart5: { l: 0.61, c: 0.246, h: 16.439 },
  sidebar: { l: 0.01, c: 0.02 },
  sidebar_foreground: { l: 1, c: 0 },
  sidebar_primary: { l: 0.4, c: 0.243, h: 264.376 },
  sidebar_primary_foreground: { l: 1, c: 0 },
  sidebar_accent: { l: 0.11, c: 0.03 },
  sidebar_accent_foreground: { l: 1, c: 0 },
  sidebar_border: { l: 0.06, c: 0.04, alpha: 0.5 },
  sidebar_ring: { l: 0.5, c: 0.09 },
};

let createOklchColor = (ref, options) => {
  let {
    baseHue,
    baseChroma,
    l_range,
    l_exponent,
    saturationFactor,
    colorizationStrength,
    hueShift,
  } = options;

  let [minL, maxL] = l_range;
  let lightness = minL + (maxL - minL) * Math.pow(ref.l, l_exponent);
  let hue = (baseHue + hueShift) % 360;

  let addedChroma = baseChroma * colorizationStrength;
  let chromaValue = (ref.c + addedChroma) * saturationFactor;

  let newColor = chroma.oklch(lightness, chromaValue, hue);
  if (ref.alpha !== undefined) {
    newColor = newColor.alpha(ref.alpha);
  }
  return newColor.css("oklch");
};

export function generateTintPalette(baseHex, controls, colorScheme) {
  controls = controls || THEME_CONTROLS;
  try {
    let useDarkTheme = colorScheme === "dark";

    let currentPrimarySaturationFactor = useDarkTheme
      ? controls.DARK_THEME_PRIMARY_SATURATION_FACTOR
      : controls.LIGHT_THEME_PRIMARY_SATURATION_FACTOR;

    let baseColor = chroma(baseHex).set(
      "oklch.c",
      `*${currentPrimarySaturationFactor}`,
    );
    let [baseL, baseC, baseH] = baseColor.oklch();
    let resolvedBaseH = Number.isNaN(baseH) ? 0 : baseH;

    let refs = useDarkTheme ? DARK_THEME_OKLCH_REFS : LIGHT_THEME_OKLCH_REFS;
    let contrast = useDarkTheme
      ? controls.DARK_THEME_CONTRAST
      : controls.LIGHT_THEME_CONTRAST;

    let l_range = useDarkTheme
      ? [0.1, 0.1 + (1 - 0.1) * contrast]
      : [1.0 - 0.9 * contrast, 1.0];

    let currentBaseColorizationStrength = useDarkTheme
      ? controls.DARK_THEME_BASE_COLORIZATION_STRENGTH
      : controls.LIGHT_THEME_BASE_COLORIZATION_STRENGTH;
    let currentAccentColorizationStrength = useDarkTheme
      ? controls.DARK_THEME_ACCENT_COLORIZATION_STRENGTH
      : controls.LIGHT_THEME_ACCENT_COLORIZATION_STRENGTH;
    let currentGlobalSaturationFactor = useDarkTheme
      ? controls.DARK_THEME_GLOBAL_SATURATION_FACTOR
      : controls.LIGHT_THEME_GLOBAL_SATURATION_FACTOR;
    let currentHueShiftAmount = useDarkTheme
      ? controls.DARK_THEME_HUE_SHIFT_AMOUNT
      : controls.LIGHT_THEME_HUE_SHIFT_AMOUNT;

    let createColor = (ref, type = "base", useOwnHue = false) => {
      let colorizationStrength =
        type === "accent"
          ? currentAccentColorizationStrength
          : currentBaseColorizationStrength;

      let hueShift =
        type === "accent" && !useOwnHue ? currentHueShiftAmount : 0;

      return createOklchColor(ref, {
        baseHue: useOwnHue ? ref.h : resolvedBaseH,
        baseChroma: useOwnHue ? 0 : baseC,
        l_range,
        l_exponent: controls.LIGHTNESS_DISTRIBUTION_EXPONENT,
        saturationFactor: currentGlobalSaturationFactor,
        colorizationStrength,
        hueShift,
      });
    };

    return {
      "--radius": "0.5rem",
      "--background": createColor(refs.background),
      "--foreground": createColor(refs.foreground),
      "--card": createColor(refs.card),
      "--card-foreground": createColor(refs.card_foreground),
      "--popover": createColor(refs.popover),
      "--popover-foreground": createColor(refs.popover_foreground),
      "--primary": createColor(refs.primary),
      "--primary-foreground": createColor(refs.primary_foreground),
      "--secondary": createColor(refs.secondary, "accent"),
      "--secondary-foreground": createColor(
        refs.secondary_foreground,
        "accent",
      ),
      "--muted": createColor(refs.muted, "accent"),
      "--muted-foreground": createColor(refs.muted_foreground, "accent"),
      "--accent": createColor(refs.accent, "accent"),
      "--accent-foreground": createColor(refs.accent_foreground, "accent"),
      "--destructive": createColor(refs.destructive, "accent"),
      "--border": createColor(refs.border),
      "--input": createColor(refs.input),
      "--ring": createColor(refs.ring, "accent"),
      "--chart-1": createColor(refs.chart1, "base", true),
      "--chart-2": createColor(refs.chart2, "base", true),
      "--chart-3": createColor(refs.chart3, "base", true),
      "--chart-4": createColor(refs.chart4, "base", true),
      "--chart-5": createColor(refs.chart5, "base", true),
      "--sidebar": createColor(refs.sidebar),
      "--sidebar-foreground": createColor(refs.sidebar_foreground),
      "--sidebar-primary": createColor(refs.sidebar_primary, "base", true),
      "--sidebar-primary_foreground": createColor(
        refs.sidebar_primary_foreground,
        "base",
        true,
      ),
      "--sidebar-accent": createColor(refs.sidebar_accent, "accent"),
      "--sidebar-accent_foreground": createColor(
        refs.sidebar_accent_foreground,
        "accent",
      ),
      "--sidebar-border": createColor(refs.sidebar_border),
      "--sidebar-ring": createColor(refs.sidebar_ring, "accent"),
    };
  } catch (error) {
    console.error("Invalid hex color for palette generation:", baseHex, error);
    return {};
  }
}

// Soft Tint
function adjustTone(argb, amount) {
  let hct = Hct.fromInt(argb);

  let newTone = Math.max(0, Math.min(100, hct.tone + amount));
  hct.tone = newTone;

  return hct.toInt();
}

export function generateMaterialYouPalette(baseHex, colorScheme = "light") {
  let theme = themeFromSourceColor(argbFromHex(baseHex));
  console.log(theme);
  console.log(colorScheme);
  let selectedScheme = new Scheme(theme.schemes[colorScheme]);
  console.log(selectedScheme);

  let isLight = colorScheme === "light";
  let baseSurface = selectedScheme.surface;

  let lowStep = isLight ? -3 : 3;
  let highStep = isLight ? -9 : 9;
  let bigStep = isLight ? -12 : 12;
  let giantStep = isLight ? -15 : 15;

  let surfaceContainerLow = adjustTone(baseSurface, lowStep);
  let surfaceContainerHighest = adjustTone(baseSurface, highStep);

  let accent = adjustTone(selectedScheme.background, bigStep);
  let accentForeground = adjustTone(selectedScheme.secondary, giantStep);

  let border = adjustTone(selectedScheme.surface, bigStep);

  return {
    "--radius": "0.5rem",
    "--background": hexFromArgb(selectedScheme.background),
    "--foreground": hexFromArgb(selectedScheme.onBackground),

    "--primary": hexFromArgb(selectedScheme.primary),
    "--primary-foreground": hexFromArgb(selectedScheme.onPrimary),
    "--secondary": hexFromArgb(selectedScheme.secondary),
    "--secondary-foreground": hexFromArgb(selectedScheme.onSecondary),

    "--accent": hexFromArgb(accent),
    "--accent-foreground": hexFromArgb(accentForeground),
    "--destructive": hexFromArgb(selectedScheme.error),

    "--card": hexFromArgb(selectedScheme.surface),
    "--card-foreground": hexFromArgb(selectedScheme.onSurface),
    "--popover": hexFromArgb(selectedScheme.surface),
    "--popover-foreground": hexFromArgb(selectedScheme.onSurface),

    "--muted": hexFromArgb(selectedScheme.surfaceVariant),
    "--muted-foreground": hexFromArgb(selectedScheme.onSurfaceVariant),
    "--border": hexFromArgb(border),
    "--input": hexFromArgb(surfaceContainerHighest),
    "--ring": hexFromArgb(selectedScheme.primary),

    "--sidebar": hexFromArgb(surfaceContainerLow),
    "--sidebar-foreground": hexFromArgb(selectedScheme.onSurface),
    "--sidebar-primary": hexFromArgb(selectedScheme.primary),
    "--sidebar-primary-foreground": hexFromArgb(selectedScheme.onPrimary),
    "--sidebar-accent": hexFromArgb(selectedScheme.secondary),
    "--sidebar-accent-foreground": hexFromArgb(selectedScheme.onSecondary),
    "--sidebar-border": hexFromArgb(selectedScheme.outlineVariant),
    "--sidebar-ring": hexFromArgb(selectedScheme.primary),

    "--chart-1": hexFromArgb(selectedScheme.primary),
    "--chart-2": hexFromArgb(selectedScheme.secondary),
    "--chart-3": hexFromArgb(selectedScheme.tertiary),
    "--chart-4": hexFromArgb(selectedScheme.primaryContainer),
    "--chart-5": hexFromArgb(selectedScheme.tertiaryContainer),
  };
}
