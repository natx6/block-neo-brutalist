export interface PodcastShow {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  feedUrl: string;
  genre: string;
  description: string;
}

export interface PodcastEp {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  date: string;
  audioUrl: string;
  artwork: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function showOf(r: any): PodcastShow | null {
  const id = String(r?.collectionId ?? "");
  if (!id) return null;
  return {
    id,
    title: String(r?.collectionName ?? "Untitled show"),
    artist: String(r?.artistName ?? ""),
    artwork: (r?.artworkUrl600 as string) || (r?.artworkUrl100 as string) || null,
    feedUrl: String(r?.feedUrl ?? ""),
    genre: String(r?.primaryGenreName ?? ""),
    description: String(r?.description ?? ""),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function epOf(r: any): PodcastEp | null {
  if (r?.wrapperType !== "podcastEpisode") return null;
  const id = String(r?.trackId ?? "");
  const audioUrl = String(r?.episodeUrl ?? "");
  if (!id || !audioUrl) return null;
  return {
    id,
    title: String(r?.trackName ?? "Untitled episode"),
    description: String(r?.description ?? r?.shortDescription ?? ""),
    durationSec: Math.round(Number(r?.trackTimeMillis || 0) / 1000) || 0,
    date: String(r?.releaseDate ?? ""),
    audioUrl,
    artwork: (r?.artworkUrl600 as string) || (r?.artworkUrl160 as string) || (r?.artworkUrl100 as string) || null,
  };
}

export async function searchPodcasts(q: string, limit = 20): Promise<PodcastShow[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=podcast&entity=podcast&limit=${limit}`
  );
  if (!res.ok) throw new Error("podcast-search-failed");
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results
    .map(showOf)
    .filter((s: PodcastShow | null): s is PodcastShow => s !== null);
}

export async function showEpisodes(collectionId: string | number): Promise<PodcastEp[]> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(String(collectionId))}&entity=podcastEpisode&limit=50`
  );
  if (!res.ok) throw new Error("podcast-search-failed");
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results
    .map(epOf)
    .filter((e: PodcastEp | null): e is PodcastEp => e !== null);
}

export async function getPodcastShow(
  collectionId: string | number
): Promise<{ show: PodcastShow | null; episodes: PodcastEp[] }> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(String(collectionId))}&entity=podcastEpisode&limit=100`
  );
  if (!res.ok) throw new Error("podcast-search-failed");
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  let show: PodcastShow | null = null;
  const episodes: PodcastEp[] = [];
  for (const r of results) {
    if (!show && (r?.wrapperType === "collection" || r?.kind === "podcast")) {
      show = showOf(r);
      continue;
    }
    const ep = epOf(r);
    if (ep) episodes.push(ep);
  }
  // Fallback: some lookups return only episodes; synthesize the show header.
  if (!show && episodes.length > 0) {
    const first = results[0] || {};
    show = {
      id: String(collectionId),
      title: String(first?.collectionName ?? "Podcast"),
      artist: String(first?.artistName ?? ""),
      artwork: (first?.artworkUrl600 as string) || (first?.artworkUrl100 as string) || null,
      feedUrl: "",
      genre: "",
      description: "",
    };
  }
  return { show, episodes };
}
