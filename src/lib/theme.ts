type Tone = "hard" | "light";
type Scheme = "dark" | "light";

type LCH = { l: number; c: number; h: number };

const VARS = [
  "--radius",
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
] as const;

type VarName = (typeof VARS)[number];
type ThemeMap = Record<VarName, string>;

const clamp = (x: number, min: number, max: number) =>
  Math.min(Math.max(x, min), max);

const normalizeHex = (hex: string) => {
  let h = hex.trim().toLowerCase();
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#([0-9a-f]{3})$/i.test(h)) {
    const r = h[1],
      g = h[2],
      b = h[3];
    h = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (!/^#([0-9a-f]{6})$/i.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return h;
};

const hexToRgb01 = (hex: string): [number, number, number] => {
  const h = normalizeHex(hex);
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  return [r, g, b];
};

const rgb01ToHex = (r: number, g: number, b: number) => {
  const to8 = (v: number) =>
    clamp(Math.round(v * 255), 0, 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to8(r)}${to8(g)}${to8(b)}`;
};

const srgbToLinear = (x: number) =>
  x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
const linearToSrgb = (x: number) =>
  x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

// sRGB (linear) -> OKLab (via LMS), constants from Bjorn Ottosson
const rgb01ToOklab = (r: number, g: number, b: number) => {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  return { L, a, b: b2 };
};

const oklabToRgb01 = (L: number, a: number, b: number) => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rl = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const r = linearToSrgb(rl);
  const g = linearToSrgb(gl);
  const b_ = linearToSrgb(bl);

  return [r, g, b_];
};

const rgb01ToOklch = (r: number, g: number, B: number): LCH => {
  const { L, a, b } = rgb01ToOklab(r, g, B);
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
};

const oklchToRgb01 = (lch: LCH): number[] => {
  const a = lch.c * Math.cos((lch.h * Math.PI) / 180);
  const b = lch.c * Math.sin((lch.h * Math.PI) / 180);
  return oklabToRgb01(lch.l, a, b);
};

const inGamut = (r: number, g: number, b: number) =>
  r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;

const toGamut = (lch: LCH): LCH => {
  // Reduce chroma until within sRGB gamut
  if (lch.c <= 0) return { ...lch, c: 0 };
  let lo = 0;
  let hi = lch.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const [r, g, b] = oklchToRgb01({ ...lch, c: mid });
    if (inGamut(r, g, b)) lo = mid;
    else hi = mid;
  }
  return { ...lch, c: lo };
};

const oklchToString = (lch: LCH) => {
  const l = +lch.l.toFixed(3);
  const c = +lch.c.toFixed(3);
  const h = +lch.h.toFixed(3);
  return `oklch(${l} ${c} ${h})`;
};

const oklchToHex = (lch: LCH) => {
  const inRgb = oklchToRgb01(toGamut(lch));
  return rgb01ToHex(inRgb[0], inRgb[1], inRgb[2]);
};

// Relative luminance for contrast decisions (sRGB)
const relLum = (r: number, g: number, b: number) => {
  const rs = srgbToLinear(r);
  const gs = srgbToLinear(g);
  const bs = srgbToLinear(b);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};
const contrastRatio = (lum1: number, lum2: number) => {
  const [L1, L2] = [lum1, lum2].sort((a, b) => b - a);
  return (L1 + 0.05) / (L2 + 0.05);
};

const pickTextOn = (bg: LCH): { hex: string; oklch: string } => {
  const whiteHex = "#fafafa";
  const blackHex = "#0a0a0a";
  const bgRgb = oklchToRgb01(toGamut(bg));
  const bgLum = relLum(bgRgb[0], bgRgb[1], bgRgb[2]);
  const wLum = relLum(...hexToRgb01(whiteHex));
  const bLum = relLum(...hexToRgb01(blackHex));
  const wc = contrastRatio(bgLum, wLum);
  const bc = contrastRatio(bgLum, bLum);
  const useWhite = wc >= bc;
  const textHex = useWhite ? whiteHex : blackHex;
  const textLch = rgb01ToOklch(...hexToRgb01(textHex));
  return { hex: textHex, oklch: oklchToString(textLch) };
};

// --- Palette helpers ---

const withTone = (base: LCH, lTarget: number, cMul: number): LCH => {
  return {
    l: clamp(lTarget, 0, 1),
    c: clamp(base.c * cMul, 0, 0.4),
    h: base.h,
  };
};

const rotateHue = (h: number, deg: number) => {
  let v = (h + deg) % 360;
  if (v < 0) v += 360;
  return v;
};

// Extract current variables from stylesheets (:root or .dark)
const readThemeFromCSS = (scheme: Scheme): Partial<ThemeMap> => {
  const result: Partial<ThemeMap> = {};
  if (typeof document === "undefined") return result;
  const wantSelector = scheme === "light" ? ":root" : ".dark";

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      // Cross-origin stylesheets may throw
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText &&
        rule.selectorText
          .split(",")
          .map((s) => s.trim())
          .includes(wantSelector)
      ) {
        const style = rule.style;
        for (let i = 0; i < style.length; i++) {
          const prop = style[i] as VarName | string;
          if ((VARS as readonly string[]).includes(prop)) {
            const val = style.getPropertyValue(prop).trim();
            if (val) (result as any)[prop] = val;
          }
        }
      }
    }
  }
  return result;
};

// Choose output formatter based on scheme (match your CSS usage)
const formatOut = (scheme: Scheme, lch: LCH) =>
  scheme === "light" ? oklchToString(lch) : oklchToHex(lch);

// Build chart colors around the brand hue
const buildCharts = (
  base: LCH,
  scheme: Scheme,
  tone: Tone
): Record<
  "--chart-1" | "--chart-2" | "--chart-3" | "--chart-4" | "--chart-5",
  string
> => {
  const offsets = [0, 60, 200, 280, 330];
  const lTargets =
    scheme === "light"
      ? tone === "hard"
        ? [0.62, 0.6, 0.56, 0.68, 0.65]
        : [0.65, 0.63, 0.6, 0.7, 0.67]
      : tone === "hard"
      ? [0.68, 0.72, 0.78, 0.7, 0.66]
      : [0.72, 0.76, 0.82, 0.74, 0.7];

  const cMul = tone === "hard" ? 1.1 : 0.95;
  const out: any = {};
  offsets.forEach((off, i) => {
    const lch: LCH = {
      l: lTargets[i],
      c: clamp(base.c * cMul, 0.12, 0.28),
      h: rotateHue(base.h, off),
    };
    out[`--chart-${i + 1}`] = formatOut(scheme, toGamut(lch));
  });
  return out;
};

// Main API
export function generateColors(
  hex: string,
  type: Tone,
  colorScheme: Scheme
): ThemeMap {
  const schemeIsLight = colorScheme === "light";
  const toneIsHard = type === "hard";
  // Baseline from CSS (if readable) with fallbacks
  const baseline = readThemeFromCSS(schemeIsLight ? "light" : "dark");

  // Base brand as OKLCH
  const baseHex = normalizeHex(hex);
  const baseLch = rgb01ToOklch(...hexToRgb01(baseHex));
  const cBoost = toneIsHard ? 1.1 : 0.95;

  // Primary
  const primaryL = schemeIsLight
    ? toneIsHard
      ? 0.58
      : 0.64
    : toneIsHard
    ? 0.75
    : 0.82;
  const primary: LCH = toGamut(
    withTone({ ...baseLch, c: baseLch.c * cBoost }, primaryL, 1)
  );

  // Ring (low-chroma brand)
  const ringL = schemeIsLight ? 0.7 : 0.66;
  const ring: LCH = toGamut({
    l: ringL,
    c: clamp(primary.c * 0.35, 0, 0.12),
    h: primary.h,
  });

  // Accent (pastel brand surface)
  const accentL = schemeIsLight ? 0.96 : 0.28;
  const accent: LCH = toGamut({
    l: accentL,
    c: clamp(primary.c * 0.25, 0, 0.1),
    h: primary.h,
  });

  // Foregrounds
  const primaryFg = pickTextOn(primary);
  const accentFg = pickTextOn(accent);

  // Sidebar primary mirrors brand
  const sidebarPrimary = primary;
  const sidebarPrimaryFg = pickTextOn(sidebarPrimary);

  // Charts
  const charts = buildCharts(primary, colorScheme, type);

  // Surfaces and structural colors
  const neutralHue = rotateHue(baseLch.h, toneIsHard ? -6 : 0);
  const neutralChroma = clamp(
    baseLch.c *
      (schemeIsLight ? (toneIsHard ? 0.16 : 0.12) : toneIsHard ? 0.24 : 0.2),
    schemeIsLight ? 0.012 : 0.02,
    schemeIsLight ? 0.045 : 0.08
  );
  const subtlerChroma = clamp(neutralChroma * 0.6, 0.01, 0.045);
  const borderChroma = clamp(neutralChroma * 0.5, 0.01, 0.04);
  const sidebarChroma = clamp(neutralChroma * 1.2, 0.018, 0.08);

  const surfaceLevels = schemeIsLight
    ? {
        background: toneIsHard ? 0.992 : 0.996,
        card: toneIsHard ? 0.972 : 0.982,
        popover: toneIsHard ? 0.976 : 0.986,
        secondary: toneIsHard ? 0.905 : 0.925,
        muted: toneIsHard ? 0.948 : 0.962,
        border: toneIsHard ? 0.845 : 0.872,
        sidebar: toneIsHard ? 0.942 : 0.956,
        input: toneIsHard ? 0.822 : 0.842,
      }
    : {
        background: toneIsHard ? 0.18 : 0.15,
        card: toneIsHard ? 0.215 : 0.19,
        popover: toneIsHard ? 0.2 : 0.18,
        secondary: toneIsHard ? 0.3 : 0.27,
        muted: toneIsHard ? 0.25 : 0.22,
        border: toneIsHard ? 0.32 : 0.28,
        sidebar: toneIsHard ? 0.13 : 0.11,
        input: toneIsHard ? 0.34 : 0.3,
      };

  const background = toGamut({
    l: surfaceLevels.background,
    c: neutralChroma,
    h: neutralHue,
  });
  const backgroundFg = pickTextOn(background);
  const card = toGamut({
    l: surfaceLevels.card,
    c: neutralChroma,
    h: neutralHue,
  });
  const cardFg = pickTextOn(card);
  const popover = toGamut({
    l: surfaceLevels.popover,
    c: neutralChroma,
    h: neutralHue,
  });
  const popoverFg = pickTextOn(popover);
  const secondary = toGamut({
    l: surfaceLevels.secondary,
    c: clamp(baseLch.c * (toneIsHard ? 0.4 : 0.3), 0.05, 0.18),
    h: rotateHue(baseLch.h, toneIsHard ? 28 : 20),
  });
  const secondaryFg = pickTextOn(secondary);
  const muted = toGamut({
    l: surfaceLevels.muted,
    c: subtlerChroma,
    h: neutralHue,
  });
  const mutedFg = pickTextOn(muted);
  const border = toGamut({
    l: surfaceLevels.border,
    c: borderChroma,
    h: neutralHue,
  });
  const input = toGamut({
    l: surfaceLevels.input,
    c: borderChroma,
    h: neutralHue,
  });
  const sidebar = toGamut({
    l: surfaceLevels.sidebar,
    c: sidebarChroma,
    h: rotateHue(baseLch.h, toneIsHard ? -28 : -20),
  });
  const sidebarFg = pickTextOn(sidebar);
  const sidebarAccent = toGamut({
    l: clamp(sidebar.l + (schemeIsLight ? -0.05 : 0.09), 0, 1),
    c: clamp(primary.c * (toneIsHard ? 0.65 : 0.55), 0.05, 0.2),
    h: rotateHue(primary.h, toneIsHard ? 42 : 34),
  });
  const sidebarAccentFg = pickTextOn(sidebarAccent);
  const sidebarBorder = toGamut({
    l: clamp(sidebar.l + (schemeIsLight ? -0.08 : 0.12), 0, 1),
    c: borderChroma,
    h: sidebar.h,
  });
  const sidebarRing = toGamut({
    l: clamp(sidebar.l + (schemeIsLight ? -0.06 : 0.1), 0, 1),
    c: clamp(primary.c * 0.4, 0.04, 0.15),
    h: primary.h,
  });
  const destructive = toGamut({
    l: schemeIsLight ? (toneIsHard ? 0.62 : 0.66) : toneIsHard ? 0.58 : 0.54,
    c: toneIsHard ? 0.26 : 0.22,
    h: 25,
  });

  // Compose theme: keep neutrals from baseline, override brand-driven vars
  const overrides: Partial<ThemeMap> = {
    "--background": formatOut(colorScheme, background),
    "--foreground": schemeIsLight ? backgroundFg.oklch : backgroundFg.hex,
    "--card": formatOut(colorScheme, card),
    "--card-foreground": schemeIsLight ? cardFg.oklch : cardFg.hex,
    "--popover": formatOut(colorScheme, popover),
    "--popover-foreground": schemeIsLight ? popoverFg.oklch : popoverFg.hex,
    "--secondary": formatOut(colorScheme, secondary),
    "--secondary-foreground": schemeIsLight
      ? secondaryFg.oklch
      : secondaryFg.hex,
    "--muted": formatOut(colorScheme, muted),
    "--muted-foreground": schemeIsLight ? mutedFg.oklch : mutedFg.hex,
    "--border": formatOut(colorScheme, border),
    "--input": formatOut(colorScheme, input),
    "--destructive": formatOut(colorScheme, destructive),
    "--primary": formatOut(colorScheme, primary),
    "--primary-foreground": schemeIsLight ? primaryFg.oklch : primaryFg.hex,
    "--ring": formatOut(colorScheme, ring),
    "--accent": formatOut(colorScheme, accent),
    "--accent-foreground": schemeIsLight ? accentFg.oklch : accentFg.hex,
    "--sidebar": formatOut(colorScheme, sidebar),
    "--sidebar-foreground": schemeIsLight ? sidebarFg.oklch : sidebarFg.hex,
    "--sidebar-primary": formatOut(colorScheme, sidebarPrimary),
    "--sidebar-primary-foreground": schemeIsLight
      ? sidebarPrimaryFg.oklch
      : sidebarPrimaryFg.hex,
    "--sidebar-accent": formatOut(colorScheme, sidebarAccent),
    "--sidebar-accent-foreground": schemeIsLight
      ? sidebarAccentFg.oklch
      : sidebarAccentFg.hex,
    "--sidebar-border": formatOut(colorScheme, sidebarBorder),
    "--sidebar-ring": formatOut(colorScheme, sidebarRing),
    ...charts,
  };

  const merged: ThemeMap = { ...(baseline as ThemeMap), ...(overrides as any) };
  return merged;
}
