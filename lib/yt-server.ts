import { Innertube } from "youtubei.js";

export interface AudioRef {
  url: string;
  mime: string;
  size: number;
}

// Module-level lazy singleton: one Innertube per request lifecycle reuse.
// No PO token needed.
let tubePromise: Promise<Innertube> | null = null;

function getTube(): Promise<Innertube> {
  if (!tubePromise) {
    tubePromise = Innertube.create({ generate_session_locally: true });
  }
  return tubePromise;
}

// In-memory cache keyed id+quality, TTL 5h (googlevideo URLs expire ~6h).
const cache = new Map<string, { ref: AudioRef; exp: number }>();
const TTL_MS = 5 * 3600 * 1000;

export function isValidVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

export interface YTOfficialResult {
  videoId: string;
  title: string;
  artist: string;
  durationSec: number;
  artwork: string;
}

function parseDurationText(text: string): number {
  const parts = text
    .trim()
    .split(":")
    .map((p) => Number(p));
  if (parts.some((n) => !isFinite(n) || n < 0)) return 0;
  let total = 0;
  for (const n of parts) total = total * 60 + n;
  return total;
}

export async function searchOfficial(q: string, limit = 12): Promise<YTOfficialResult[]> {
  try {
    const yt = await getTube();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await yt.music.search(q, { type: "song" })) as any;
    // Prefer the songs shelf; fall back to first shelf with contents.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shelf: any = res?.songs;
    if (!shelf || !Array.isArray(shelf.contents) || shelf.contents.length === 0) {
      const shelves: unknown = res?.contents;
      shelf = Array.isArray(shelves)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (shelves as any[]).find((s) => Array.isArray(s?.contents) && s.contents.length > 0)
        : undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = Array.isArray(shelf?.contents) ? shelf.contents : [];
    const out: YTOfficialResult[] = [];
    for (const item of items) {
      if (out.length >= limit) break;
      const id = String(item?.id ?? "");
      if (!isValidVideoId(id)) continue;
      const title = String(item?.title ?? "Untitled") || "Untitled";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const artists: any[] = Array.isArray(item?.artists) ? item.artists : [];
      const artist = artists
        .map((a) => String(a?.name ?? "").trim())
        .filter(Boolean)
        .join(", ");
      let durationSec = 0;
      if (typeof item?.duration?.seconds === "number" && isFinite(item.duration.seconds)) {
        durationSec = Math.round(item.duration.seconds);
      } else if (typeof item?.duration?.text === "string") {
        durationSec = parseDurationText(item.duration.text);
      } else if (typeof item?.duration === "number") {
        durationSec = Math.round(item.duration);
      }
      out.push({
        videoId: id,
        title,
        artist,
        durationSec,
        artwork: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function normalizeQuality(q: string | null | undefined): string {
  const v = (q ?? "Good").trim().toLowerCase();
  if (v === "lite") return "Lite";
  if (v === "best") return "Best";
  return "Good";
}

const CLIENTS = ["IOS", "TV", "TV_EMBEDDED", "YTMUSIC_ANDROID", "ANDROID", "WEB_EMBEDDED", "MWEB"] as const;

export async function probeClients(id: string): Promise<Record<string, string>> {
  const yt = await getTube();
  const out: Record<string, string> = {};
  for (const client of CLIENTS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info = (await yt.getInfo(id, { client })) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f: any = info.chooseFormat({ type: "audio", quality: "best" });
      out[client] = f?.url ? `OK ${(f.url as string).length}` : "NO_URL";
    } catch (e) {
      out[client] = `ERR ${String(e).slice(0, 80)}`;
    }
  }
  return out;
}

export async function getAudio(id: string, quality: string = "Good"): Promise<AudioRef> {
  if (!isValidVideoId(id)) throw new Error("bad-id");
  const q = normalizeQuality(quality);
  const key = `${id}:${q}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now() && hit.ref.url) return hit.ref;

  const yt = await getTube();
  // ONLY some clients yield stream URLs; try in order (datacenter IPs get
  // bot-checked on certain clients, so fall through on failure).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let info: any = null;
  let lastErr = "";
  for (const client of CLIENTS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info = (await yt.getInfo(id, { client })) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const probe: any = info.chooseFormat({ type: "audio", quality: "best" });
      if (probe?.url) break;
      info = null;
    } catch (e) {
      lastErr = String(e).slice(0, 120);
      info = null;
    }
  }
  if (!info) throw new Error(`yt-audio-failed ${lastErr}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let format: any = info.chooseFormat({ type: "audio", quality: "best" });

  if (q === "Lite") {
    // Lowest bitrate audio for Lite.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fmts: any[] = info.streaming_data?.adaptive_formats ?? [];
    const audioOnly = fmts.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => typeof f?.mime_type === "string" && f.mime_type.includes("audio") && f.url
    );
    if (audioOnly.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audioOnly.sort((a: any, b: any) => (a.bitrate ?? 0) - (b.bitrate ?? 0));
      format = audioOnly[0];
    }
  }

  const url = String(format?.url ?? "");
  if (!url) throw new Error("yt-audio-failed");
  const rawMime = String(format?.mime_type ?? "audio/mp4");
  const ref: AudioRef = {
    url,
    mime: rawMime.split(";")[0].trim() || "audio/mp4",
    size: Number(format?.content_length ?? 0) || 0,
  };
  cache.set(key, { ref, exp: Date.now() + TTL_MS });
  return ref;
}
