import { isValidVideoId, probeClients } from "../../../../lib/yt-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!isValidVideoId(id)) {
    return Response.json({ error: "bad-id" }, { status: 400 });
  }
  try {
    const clients = await probeClients(id);
    return Response.json({ id, clients });
  } catch (e) {
    return Response.json({ error: "diag-failed", detail: String(e).slice(0, 200) }, { status: 502 });
  }
}
