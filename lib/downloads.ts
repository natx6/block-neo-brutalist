import { db } from "./db";
import { ART_FALLBACKS, cleanFileTitle } from "./catalog";
import { streamUrl, type SaavnResult } from "./saavn";

import { parseBlob } from "music-metadata-browser";

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

export function probeDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = new Audio();
      a.preload = "metadata";
      const done = (d: number) => {
        URL.revokeObjectURL(url);
        resolve(isFinite(d) && d > 0 ? Math.round(d) : 0);
      };
      a.onloadedmetadata = () => done(a.duration);
      a.onerror = () => done(0);
      a.src = url;
      setTimeout(() => done(0), 8000);
    } catch {
      resolve(0);
    }
  });
}

function fallbackArt(index: number) {
  return ART_FALLBACKS[index % ART_FALLBACKS.length];
}

interface EmbeddedTags {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string | null;
}

// Read ID3/MP4/Vorbis tags (incl. embedded cover art) from a local file.
// Never throws — returns {} on any failure or after 8s.
async function readEmbeddedTags(file: Blob): Promise<EmbeddedTags> {
  try {
    const meta = await Promise.race([
      parseBlob(file),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (!meta) return {};
    const common = meta.common || {};
    let artwork: string | null = null;
    const pic = common.picture?.[0];
    if (pic?.data?.length) {
      const bytes = pic.data as Uint8Array;
      let binary = "";
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
      }
      const mime = typeof pic.format === "string" && pic.format.includes("/") ? pic.format : "image/jpeg";
      artwork = `data:${mime};base64,${btoa(binary)}`;
    }
    const artist = Array.isArray(common.artists) && common.artists.length
      ? common.artists.join(", ")
      : typeof common.artist === "string" ? common.artist : undefined;
    return {
      title: typeof common.title === "string" ? common.title : undefined,
      artist,
      album: typeof common.album === "string" ? common.album : undefined,
      artwork,
    };
  } catch {
    return {};
  }
}

export async function saveFileTracks(files: FileList | File[], quality = "Good") {
  const arr = Array.from(files).filter((f) => f && f.size > 0);
  if (arr.length === 0) throw new Error("No files picked");
  const saved = [];
  for (let i = 0; i < arr.length; i++) {
    const f = arr[i];
    const fallback = cleanFileTitle(f.name);
    const [tags, durationSec] = await Promise.all([
      readEmbeddedTags(f),
      probeDuration(f),
    ]);
    const art = fallbackArt(Date.now() % 1000 + i);
    const rec = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${i}`,
      title: tags.title || fallback.title,
      artist: tags.artist || fallback.artist,
      album: tags.album || "",
      durationSec,
      icon: art.icon,
      bg: art.bg,
      artwork: tags.artwork ?? null,
      blob: f,
      mime: f.type || "audio/mpeg",
      size: f.size,
      quality,
      addedAt: Date.now() + i,
      playCount: 0,
    };
    await db.tracks.put(rec);
    saved.push(rec);
  }
  return saved;
}

export async function saveUrlTrack(url: string, quality = "Good", onProgress?: (pct: number) => void) {
  const name = decodeURIComponent(url.split("?")[0].split("/").pop() || "link-audio");
  const { title, artist } = cleanFileTitle(name);
  const blob = await downloadWithProgress(url, (p) => onProgress?.(p));
  if (!(blob.type.startsWith("audio/") || blob.size > 1024)) {
    throw new Error("That link did not return audio");
  }
  const durationSec = await probeDuration(blob);
  const art = fallbackArt(Date.now() % 1000);
  const rec = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    title,
    artist,
    durationSec,
    icon: art.icon,
    bg: art.bg,
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

export async function saveSaavnTrack(
  r: SaavnResult,
  quality = "Good",
  onProgress?: (pct: number) => void
) {
  const id = `saavn-${r.id}`;
  const existing = await db.tracks.get(id);
  if (existing) return existing;
  const urls = quality === "Lite" ? [r.url] : [...new Set([streamUrl(r, quality), r.url])];
  let lastError: unknown = null;
  for (const u of urls) {
    try {
      const blob = await downloadWithProgress(u, (p) => onProgress?.(p));
      if (blob.size < 1024) throw new Error("saavn-download-failed");
      const probed = await probeDuration(blob);
      const art = fallbackArt(Date.now() % 1000);
      const rec = {
        id,
        title: r.title,
        artist: r.artist,
        durationSec: probed || r.durationSec,
        icon: "music_note",
        bg: art.bg,
        artwork: r.artwork,
        source: "saavn",
        sourceId: r.id,
        blob,
        mime: blob.type || "audio/mpeg",
        size: blob.size,
        quality,
        addedAt: Date.now(),
        playCount: 0,
      };
      await db.tracks.put(rec);
      return rec;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("saavn-download-failed");
}
