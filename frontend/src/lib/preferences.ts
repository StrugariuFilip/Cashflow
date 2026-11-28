export type ColorTheme = "flamingo" | "violet" | "blue" | "neon";
export type ColorMode = "dark" | "light";

const THEME_KEY = "cashflow_color_theme";
const MODE_KEY = "cashflow_color_mode";

export function getSavedTheme(): ColorTheme {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "violet" || saved === "blue" || saved === "neon" ? saved : "flamingo";
}

export function applyTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

export function getSavedMode(): ColorMode {
  return localStorage.getItem(MODE_KEY) === "light" ? "light" : "dark";
}

export function applyMode(mode: ColorMode) {
  document.documentElement.dataset.mode = mode;
  localStorage.setItem(MODE_KEY, mode);
}
