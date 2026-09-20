export interface SaavnResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  year: string;
  artwork: string | null;
  url: string;
}

export async function searchSaavn(q: string, limit = 12): Promise<SaavnResult[]> {
  const res = await fetch(
    `/api/saavn/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  if (!res.ok) throw new Error("saavn-search-failed");
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = Array.isArray(json?.results) ? json.results : [];
  return results
    .map(
      (r: {
        id?: string;
        title?: string;
        artist?: string;
        album?: string;
        durationSec?: number;
        year?: string;
        artwork?: string | null;
        url?: string;
      }) => ({
        id: String(r?.id ?? ""),
        title: String(r?.title ?? "Untitled"),
        artist: String(r?.artist ?? ""),
        album: String(r?.album ?? ""),
        durationSec: typeof r?.durationSec === "number" ? r.durationSec : 0,
        year: String(r?.year ?? ""),
        artwork: r?.artwork ?? null,
        url: String(r?.url ?? ""),
      })
    )
    .filter((r: SaavnResult) => r.id.length > 0 && r.url.length > 0);
}

// Saavn decrypts to the 96kbps URL. Good/Best swap to the 320kbps CDN file.
// If the 320 fetch fails at save time, downloads.ts retries with the Lite URL.
export function streamUrl(r: SaavnResult, quality = "Good"): string {
  if (quality === "Lite") return r.url;
  try {
    const hi = r.url.replace("_96.", "_320.");
    return hi || r.url;
  } catch {
    return r.url;
  }
}
