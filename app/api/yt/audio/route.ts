export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const quality = searchParams.get("quality") ?? "Good";

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return Response.json({ error: "bad-id" }, { status: 400 });
  }

  const workerBase = process.env.WORKER_URL;
  if (!workerBase) {
    return Response.json({ error: "no-worker" }, { status: 501 });
  }

  let workerRes: Response;
  try {
    const base = workerBase.replace(/\/+$/, "");
    workerRes = await fetch(
      `${base}/audio?id=${encodeURIComponent(id)}&quality=${encodeURIComponent(quality)}`
    );
  } catch {
    return Response.json({ error: "worker-failed" }, { status: 502 });
  }

  if (!workerRes.ok || !workerRes.body) {
    return Response.json({ error: "worker-failed" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", workerRes.headers.get("content-type") || "audio/mp4");
  headers.set("Content-Disposition", `attachment; filename="${id}.mp4"`);
  const len = workerRes.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return new Response(workerRes.body, { headers });
}
