import { signal } from "@preact/signals";

type Theme = "light" | "dark";

const STORAGE_KEY = "que-theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const theme = signal<Theme>(getInitialTheme());

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(STORAGE_KEY, t);
  theme.value = t;
}

export function toggleTheme() {
  applyTheme(theme.value === "dark" ? "light" : "dark");
}

// Apply immediately on module load so there's no flash of the wrong theme.
applyTheme(theme.value);
