import { db } from "./db";
import { CATALOG } from "./catalog";

export async function downloadWithProgress(
  url: string,
  onProgress: (pct: number, loaded: number, total: number) => void
): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`fetch ${res.status}`);
  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(total ? Math.round((loaded / total) * 100) : 0, loaded, total);
  }
  return new Blob(chunks, { type: res.headers.get("content-type") || "audio/mpeg" });
}

export async function saveCatalogTrack(id: string, quality = "Good", onProgress?: (pct: number) => void) {
  const meta = CATALOG.find((t) => t.id === id);
  if (!meta) throw new Error("unknown track");
  const existing = await db.tracks.get(id);
  if (existing) return existing;
  const blob = await downloadWithProgress(meta.remoteUrl, (p) => onProgress?.(p));
  const rec = {
    id: meta.id,
    title: meta.title,
    artist: meta.artist,
    durationSec: meta.durationSec,
    icon: meta.icon,
    bg: meta.bg,
    blob,
    mime: blob.type || "audio/mpeg",
    size: blob.size,
    quality,
    addedAt: Date.now(),
    playCount: 0,
  };
  await db.tracks.put(rec);
  return rec;
}

export async function isSaved(id: string): Promise<boolean> {
  return (await db.tracks.get(id)) !== undefined;
}

const SETTINGS_KEY = "puff-settings-v1";

export interface Settings {
  quality: string;
  wifiOnly: boolean;
  offlineMode: boolean;
  sleepOn: boolean;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { quality: "Good", wifiOnly: true, offlineMode: false, sleepOn: true, ...JSON.parse(raw) };
  } catch {}
  return { quality: "Good", wifiOnly: true, offlineMode: false, sleepOn: true };
}

export function storeSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}
