export interface TrackMeta {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  icon: string;
  bg: string;
}

// No mock catalog. The library builds as the user imports.
// Pastel art fallbacks cycle while real artwork lands later.
export const ART_FALLBACKS = [
  { icon: "cloud", bg: "#E9DCFF" },
  { icon: "water_drop", bg: "#D4F7E6" },
  { icon: "wb_twilight", bg: "#FFE0D6" },
  { icon: "spa", bg: "#C7F5DC" },
  { icon: "star", bg: "#D1EEFF" },
  { icon: "coffee", bg: "#FFD6B8" },
];

export function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtMB(bytes: number): string {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function cleanFileTitle(name: string): { title: string; artist: string } {
  const base = name.replace(/\.[a-z0-9]+$/i, "").replace(/[_+]+/g, " ").trim();
  const parts = base.split(/\s+-\s+/);
  if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(" - ") };
  return { title: base || "Untitled", artist: "My Stash" };
}
