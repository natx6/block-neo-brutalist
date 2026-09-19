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

export function normalizeQuality(q: string | null | undefined): string {
  const v = (q ?? "Good").trim().toLowerCase();
  if (v === "lite") return "Lite";
  if (v === "best") return "Best";
  return "Good";
}

export async function getAudio(id: string, quality: string = "Good"): Promise<AudioRef> {
  if (!isValidVideoId(id)) throw new Error("bad-id");
  const q = normalizeQuality(quality);
  const key = `${id}:${q}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now() && hit.ref.url) return hit.ref;

  const yt = await getTube();
  // ONLY the IOS client yields stream URLs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info = (await yt.getInfo(id, { client: "IOS" })) as any;
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
