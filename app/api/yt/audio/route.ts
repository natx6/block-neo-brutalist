import { getAudio, isValidVideoId } from "../../../../lib/yt-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Returns JSON {url,mime,size} with the direct googlevideo URL.
// Never proxies bytes here: googlevideo has no CORS headers, so the
// browser <audio> element loads the URL directly (fetch() would be blocked).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const quality = searchParams.get("quality") ?? "Good";

  if (!isValidVideoId(id)) {
    return Response.json({ error: "bad-id" }, { status: 400 });
  }

  try {
    const ref = await getAudio(id, quality);
    return Response.json({ url: ref.url, mime: ref.mime, size: ref.size });
  } catch {
    return Response.json({ error: "yt-audio-failed" }, { status: 502 });
  }
}
