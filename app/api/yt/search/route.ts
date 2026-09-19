export const maxDuration = 60;

export async function GET(req: Request) {
  const workerBase = process.env.WORKER_URL;
  if (!workerBase) {
    return Response.json({ error: "no-worker" }, { status: 501 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limit = searchParams.get("limit") ?? "15";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const base = workerBase.replace(/\/+$/, "");
    const workerRes = await fetch(
      `${base}/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
      { signal: controller.signal }
    );
    if (!workerRes.ok) {
      return Response.json({ error: "worker-failed" }, { status: 502 });
    }
    const json = await workerRes.json();
    if (!json || !Array.isArray(json.results)) {
      return Response.json({ error: "worker-failed" }, { status: 502 });
    }
    return Response.json(json);
  } catch {
    return Response.json({ error: "worker-failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
