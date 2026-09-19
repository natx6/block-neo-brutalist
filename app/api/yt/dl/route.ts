import { getAudio, isValidVideoId } from "../../../../lib/yt-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Proxies googlevideo bytes server-side (browser fetch() is CORS-blocked,
// so saves must stream through our route). Returns the audio as a download.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const quality = searchParams.get("quality") ?? "Good";

  if (!isValidVideoId(id)) {
    return Response.json({ error: "bad-id" }, { status: 400 });
  }

  try {
    const ref = await getAudio(id, quality);
    // googlevideo throttles bursts from datacenter IPs: retry spaced out.
    let upstream: Response | null = null;
    const waits = [0, 2000, 5000, 9000, 15000];
    for (let attempt = 0; attempt < waits.length; attempt++) {
      if (waits[attempt] > 0) await new Promise((r) => setTimeout(r, waits[attempt]));
      try {
        const r = await fetch(ref.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            Range: "bytes=0-",
            Accept: "*/*",
          },
        });
        if (r.ok && r.body) {
          upstream = r;
          break;
        }
        // 403/429 = throttle: retry. Other 4xx: retry once anyway (fresh URL next loop? no — same URL).
        if (r.status !== 403 && r.status !== 429 && r.status < 500) break;
      } catch {
        // network error: retry
      }
    }
    if (!upstream || !upstream.body) {
      return Response.json({ error: "yt-download-failed" }, { status: 502 });
    }
    const out = new Headers();
    out.set("Content-Type", ref.mime || upstream.headers.get("content-type") || "audio/mp4");
    out.set("Content-Disposition", `attachment; filename="${id}.m4a"`);
    const len = upstream.headers.get("content-length");
    if (len) out.set("Content-Length", len);
    else if (ref.size > 0) out.set("Content-Length", String(ref.size));
    return new Response(upstream.body, { headers: out });
  } catch {
    return Response.json({ error: "yt-download-failed" }, { status: 502 });
  }
}
