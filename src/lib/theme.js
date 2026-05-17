// Theme resolver runtime.
//
// Prioridad:
//   1) Query string `?theme=ocean` — marketing arma URLs con tema para A/B,
//      campañas estacionales o partner-branding. La selección persiste en
//      localStorage para que el siguiente load del mismo user mantenga el tema.
//   2) localStorage (preferencia previa).
//   3) VITE_DEFAULT_THEME (env por deploy).
//   4) "forest" hardcoded.

export const THEMES = ["forest", "ocean", "sunset"];
const STORAGE_KEY = "egresados_theme";
const DEFAULT_THEME = import.meta.env.VITE_DEFAULT_THEME || "forest";

export function resolveTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;

  const url = new URLSearchParams(window.location.search).get("theme");
  if (url && THEMES.includes(url)) {
    localStorage.setItem(STORAGE_KEY, url);
    return url;
  }
  // ?theme=default o ?theme=reset resetea a env default
  if (url === "default" || url === "reset") {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_THEME;
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && THEMES.includes(saved)) return saved;

  return DEFAULT_THEME;
}

export function applyTheme(name) {
  if (typeof document === "undefined") return;
  if (name === "forest") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", name);
  }
}

export function setTheme(name) {
  if (!THEMES.includes(name)) return;
  if (name === DEFAULT_THEME && name === "forest") {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, name);
  }
  applyTheme(name);
}
