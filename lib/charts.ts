export interface ChartSong {
  title: string;
  artist: string;
  artwork: string | null;
}

export const GENRES = [
  { label: "All", id: "" },
  { label: "Pop", id: "14" },
  { label: "Hip-Hop", id: "18" },
  { label: "Electronic", id: "7" },
  { label: "R&B/Soul", id: "15" },
];

interface ItunesEntry {
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  "im:image"?: Array<{ label?: string }>;
}

export async function fetchCharts(genreId = "", limit = 15): Promise<ChartSong[]> {
  try {
    const genrePath = genreId ? `/genre/${genreId}` : "";
    const url = `https://itunes.apple.com/us/rss/topsongs/limit=${limit}${genrePath}/json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const entries: ItunesEntry[] = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
    return entries
      .map((e) => {
        const images = Array.isArray(e["im:image"]) ? e["im:image"] : [];
        const artwork = images.length > 0 ? images[images.length - 1]?.label ?? null : null;
        return {
          title: e["im:name"]?.label ?? "Untitled",
          artist: e["im:artist"]?.label ?? "Unknown artist",
          artwork: artwork || null,
        };
      })
      .filter((s) => s.title.length > 0);
  } catch {
    return [];
  }
}
