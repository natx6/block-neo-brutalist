export interface YTResult {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  artwork: string | null;
}

export function ytArtwork(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export async function searchYouTube(q: string, limit = 12): Promise<YTResult[]> {
  const res = await fetch(`/api/yt/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  if (!res.ok) throw new Error("yt-search-failed");
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results
    .map((r: { videoId?: string; title?: string; artist?: string; durationSec?: number; artwork?: string | null }) => ({
      videoId: String(r?.videoId ?? ""),
      title: String(r?.title ?? "Untitled"),
      artist: String(r?.artist ?? ""),
      durationSec: typeof r?.durationSec === "number" ? r.durationSec : 0,
      artwork: r?.artwork ?? null,
    }))
    .filter((r: YTResult) => r.videoId.length > 0);
}

// Preview: resolve the direct googlevideo URL via /api/yt/audio.
// The URL goes straight into the <audio> element (googlevideo has no
// CORS headers, so browser fetch() is blocked — never fetch the URL).
export async function ytPreviewUrl(
  videoId: string,
  quality = "Good"
): Promise<{ url: string }> {
  const res = await fetch(
    `/api/yt/audio?id=${encodeURIComponent(videoId)}&quality=${encodeURIComponent(quality)}`
  );
  if (!res.ok) throw new Error("yt-audio-failed");
  const json = await res.json();
  const url = String(json?.url ?? "");
  if (!url) throw new Error("yt-audio-failed");
  return { url };
}

// Save: stream googlevideo bytes through our /api/yt/dl proxy route.
export function ytAudioUrl(videoId: string, quality = "Good"): string {
  return `/api/yt/dl?id=${encodeURIComponent(videoId)}&quality=${encodeURIComponent(quality)}`;
}
