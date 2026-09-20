export interface Theme {
  id: string;
  name: string;
  desc: string;
  swatches: [string, string, string];
  /** Home-screen / in-app mascot for this theme. Falls back to the Puff icon. */
  icon: string;
}

const iconFor = (id: string) => `/icons/icon-${id}.png`;

export const THEMES: Theme[] = [
  { id: "puff", name: "Puff", desc: "Soft pastel clay", swatches: ["#fff7ff", "#d5c4ff", "#a6d7fe"], icon: iconFor("puff") },
  { id: "midnight", name: "Midnight", desc: "Dark plum glow", swatches: ["#17121f", "#b79cff", "#8fd0ff"], icon: iconFor("midnight") },
  { id: "matcha", name: "Matcha", desc: "Calm green cream", swatches: ["#f6f7ec", "#5c7a3f", "#3f7a6b"], icon: iconFor("matcha") },
  { id: "sunset", name: "Sunset", desc: "Warm peach glow", swatches: ["#fff6f0", "#c25e3a", "#3a7d8c"], icon: iconFor("sunset") },
  { id: "ocean", name: "Ocean", desc: "Deep sea fresh", swatches: ["#f2f8ff", "#2f6db3", "#3f9a8c"], icon: iconFor("ocean") },
  { id: "void", name: "Void", desc: "True black OLED", swatches: ["#000000", "#e8e8ec", "#7dd0ff"], icon: iconFor("void") },
  { id: "espresso", name: "Espresso", desc: "Dark coffee roast", swatches: ["#1b130e", "#e0a458", "#7fb3a3"], icon: iconFor("espresso") },
  { id: "indigo", name: "Indigo Dusk", desc: "Dark electric indigo", swatches: ["#141222", "#8f9bff", "#67e8f9"], icon: iconFor("indigo") },
  { id: "forest", name: "Forest Night", desc: "Dark moss glow", swatches: ["#101b14", "#9be15d", "#7dd3c0"], icon: iconFor("forest") },
  { id: "zine", name: "Indie Zine", desc: "Photocopy paper ink", swatches: ["#f4f1e8", "#1c1a17", "#d43d2a"], icon: iconFor("zine") },
];

const KEY = "puff-theme";

export function loadTheme(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return "puff";
  try {
    const v = localStorage.getItem(KEY);
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch {}
  return "puff";
}

export function themeIcon(id: string): string {
  const t = THEMES.find((t) => t.id === id);
  return t ? t.icon : "/icons/icon-puff.png";
}

export function applyTheme(id: string): void {
  const valid = THEMES.some((t) => t.id === id) ? id : "puff";
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = valid;
    // Keep the phone status bar / browser chrome on the theme color,
    // and point favicon + touch icon at the theme mascot.
    try {
      const theme = THEMES.find((t) => t.id === valid) ?? THEMES[0];
      const bg = theme.swatches[0];
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", bg);
      const swapIcon = (rel: string) => {
        let link = document.querySelector(`link[rel="${rel}"]`);
        if (!link) {
          link = document.createElement("link");
          link.setAttribute("rel", rel);
          document.head.appendChild(link);
        }
        link.setAttribute("href", theme.icon);
      };
      swapIcon("icon");
      swapIcon("apple-touch-icon");
    } catch {}
  }
  try {
    localStorage.setItem(KEY, valid);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("puff-theme", { detail: valid }));
  } catch {}
}
