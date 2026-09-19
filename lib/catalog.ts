export interface CatalogTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  icon: string;
  bg: string;
  remoteUrl: string;
}

// Public sample MP3s for Phase 1 stand-in streams.
// Later these remoteUrls get replaced by the Fly worker /stream?sourceId=...
export const CATALOG: CatalogTrack[] = [
  {
    id: "cotton-candy-clouds",
    title: "Cotton Candy Clouds",
    artist: "Lofi Pillow",
    durationSec: 208,
    icon: "cloud",
    bg: "#E9DCFF",
    remoteUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "marshmallow-sunset",
    title: "Marshmallow Sunset",
    artist: "Sweet Pea",
    durationSec: 194,
    icon: "wb_twilight",
    bg: "#FFE0D6",
    remoteUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "boba-rain",
    title: "Boba Rain",
    artist: "Tea Garden",
    durationSec: 176,
    icon: "water_drop",
    bg: "#D4F7E6",
    remoteUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "lavender-fields",
    title: "Lavender Fields",
    artist: "Slumber Pup",
    durationSec: 242,
    icon: "spa",
    bg: "#E9DCFF",
    remoteUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
  {
    id: "starlight-hug",
    title: "Starlight Hug",
    artist: "Fluff",
    durationSec: 221,
    icon: "star",
    bg: "#D1EEFF",
    remoteUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  },
  {
    id: "warm-honey-milk",
    title: "Warm Honey Milk",
    artist: "Snooze Bear",
    durationSec: 186,
    icon: "coffee",
    bg: "#FFD6B8",
    remoteUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  },
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
