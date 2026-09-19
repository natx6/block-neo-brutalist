import { Innertube } from "youtubei.js";
import { searchOfficial } from "../../../../lib/yt-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let tubePromise: Promise<Innertube> | null = null;

function getTube(): Promise<Innertube> {
  if (!tubePromise) {
    tubePromise = Innertube.create({ generate_session_locally: true });
  }
  return tubePromise;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const rawLimit = Number(searchParams.get("limit") ?? "12");
  const limit = Math.min(25, Math.max(1, Math.floor(rawLimit) || 12));
  const officialParam = searchParams.get("official");
  const wantOfficial = officialParam !== "0";
  if (!q) return Response.json({ results: [], official: wantOfficial });

  if (wantOfficial) {
    const official = await searchOfficial(q, limit);
    if (official.length > 0) {
      return Response.json({ results: official, official: true });
    }
    // Fall through to web search fallback below.
  }

  try {
    const yt = await getTube();
    const search = await yt.search(q, { type: "video" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = ((search as any).results ?? []) as any[];
    const results = [];
    for (const v of items) {
      if (results.length >= limit) break;
      const nodeType = v?.type ?? v?.constructor?.name;
      if (nodeType !== "Video") continue;
      const id = String(v?.id ?? "");
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
      const title = typeof v?.title === "string" ? v.title : String(v?.title ?? "Untitled") || "Untitled";
      const artist = String(v?.author?.name ?? "") || "";
      const dur = v?.duration;
      const durationSec =
        typeof dur === "number"
          ? dur
          : typeof dur?.seconds === "number"
            ? dur.seconds
            : 0;
      results.push({
        videoId: id,
        title,
        artist,
        durationSec,
        artwork: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      });
    }
    return Response.json({ results, official: false });
  } catch {
    return Response.json({ error: "yt-search-failed" }, { status: 502 });
  }
}
