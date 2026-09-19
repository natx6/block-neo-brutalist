export interface YTResult {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  artwork: string | null;
}

export class WorkerMissing extends Error {
  constructor(message = "no-worker") {
    super(message);
    this.name = "WorkerMissing";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResult(r: any): YTResult | null {
  const videoId = String(r?.videoId ?? r?.id ?? "");
  if (!videoId) return null;
  const artwork =
    r?.artwork ?? r?.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return {
    videoId,
    title: r?.title || "Untitled",
    artist: r?.artist || "Unknown artist",
    durationSec: typeof r?.durationSec === "number" ? r.durationSec : Number(r?.durationSec) || 0,
    artwork: artwork || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

export async function searchYouTube(q: string, limit = 15): Promise<YTResult[]> {
  const res = await fetch(`/api/yt/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  if (res.status === 501) throw new WorkerMissing();
  if (!res.ok) throw new Error("yt-search-failed");
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results.map(mapResult).filter((r: YTResult | null): r is YTResult => r !== null);
}

export function ytAudioUrl(videoId: string, quality = "Good"): string {
  return `/api/yt/audio?id=${encodeURIComponent(videoId)}&quality=${encodeURIComponent(quality)}`;
}

export function ytPreviewUrl(videoId: string): string {
  // Preview also goes through /api/yt/audio so WORKER_URL never leaks client-side.
  return ytAudioUrl(videoId);
}
