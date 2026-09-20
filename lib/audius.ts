const BASE = "https://api.audius.co";
const APP = "PUFF";

export interface OnlineResult {
  sourceId: string;
  title: string;
  artist: string;
  durationSec: number;
  artwork: string | null;
}

interface RawTrack {
  id: string;
  title?: string;
  duration?: number;
  artwork?: Record<string, string>;
  user?: { name?: string; handle?: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTrack(d: any): OnlineResult {
  const raw = d as RawTrack;
  const art = raw.artwork || {};
  return {
    sourceId: String(raw.id || ""),
    title: raw.title || "Untitled",
    artist: raw.user?.name || raw.user?.handle || "Unknown artist",
    durationSec: typeof raw.duration === "number" ? raw.duration : 0,
    artwork: art["480x480"] || art["150x150"] || null,
  };
}

export async function searchAudius(query: string, limit = 15): Promise<OnlineResult[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(
    `${BASE}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=${APP}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`search ${res.status}`);
  const json = await res.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  return data.map(mapTrack).filter((t: OnlineResult) => t.sourceId);
}

export function audiusStreamUrl(sourceId: string): string {
  return `${BASE}/v1/tracks/${encodeURIComponent(sourceId)}/stream?app_name=${APP}`;
}

export async function trendingAudius(genre = "", limit = 10): Promise<OnlineResult[]> {
  try {
    const g = genre.trim();
    const url =
      `${BASE}/v1/tracks/trending?app_name=${APP}&limit=${limit}` +
      (g ? `&genre=${encodeURIComponent(g)}` : "");
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map(mapTrack).filter((t: OnlineResult) => t.sourceId);
  } catch {
    return [];
  }
}
