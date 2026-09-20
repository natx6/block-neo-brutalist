export interface Theme {
  id: string;
  name: string;
  desc: string;
  swatches: [string, string, string];
}

export const THEMES: Theme[] = [
  { id: "puff", name: "Puff", desc: "Soft pastel clay", swatches: ["#fff7ff", "#d5c4ff", "#a6d7fe"] },
  { id: "midnight", name: "Midnight", desc: "Dark plum glow", swatches: ["#17121f", "#b79cff", "#8fd0ff"] },
  { id: "matcha", name: "Matcha", desc: "Calm green cream", swatches: ["#f6f7ec", "#5c7a3f", "#3f7a6b"] },
  { id: "sunset", name: "Sunset", desc: "Warm peach glow", swatches: ["#fff6f0", "#c25e3a", "#3a7d8c"] },
  { id: "ocean", name: "Ocean", desc: "Deep sea fresh", swatches: ["#f2f8ff", "#2f6db3", "#3f9a8c"] },
  { id: "void", name: "Void", desc: "True black OLED", swatches: ["#000000", "#e8e8ec", "#7dd0ff"] },
  { id: "espresso", name: "Espresso", desc: "Dark coffee roast", swatches: ["#1b130e", "#e0a458", "#7fb3a3"] },
  { id: "indigo", name: "Indigo Dusk", desc: "Dark electric indigo", swatches: ["#141222", "#8f9bff", "#67e8f9"] },
  { id: "forest", name: "Forest Night", desc: "Dark moss glow", swatches: ["#101b14", "#9be15d", "#7dd3c0"] },
  { id: "zine", name: "Indie Zine", desc: "Photocopy paper ink", swatches: ["#f4f1e8", "#1c1a17", "#d43d2a"] },
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

export function applyTheme(id: string): void {
  const valid = THEMES.some((t) => t.id === id) ? id : "puff";
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = valid;
    // Keep the phone status bar / browser chrome on the theme color.
    try {
      const bg = THEMES.find((t) => t.id === valid)?.swatches[0] || "#fff7ff";
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", bg);
    } catch {}
  }
  try {
    localStorage.setItem(KEY, valid);
  } catch {}
}
