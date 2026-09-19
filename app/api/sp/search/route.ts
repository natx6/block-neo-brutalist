export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-input" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const query = String(b.query ?? "").trim();
  const clientId = String(b.clientId ?? "").trim();
  const clientSecret = String(b.clientSecret ?? "").trim();
  if (!query || !clientId || !clientSecret) {
    return Response.json({ error: "bad-input" }, { status: 400 });
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) {
      return Response.json({ error: "sp-auth-failed" }, { status: 502 });
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const token = String(tokenJson?.access_token ?? "");
    if (!token) {
      return Response.json({ error: "sp-auth-failed" }, { status: 502 });
    }

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1&market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!searchRes.ok) {
      return Response.json({ error: "sp-search-failed" }, { status: 502 });
    }
    const searchJson = (await searchRes.json()) as {
      tracks?: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items?: any[];
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item: any = searchJson?.tracks?.items?.[0];
    if (!item) {
      return Response.json({ error: "sp-no-match" }, { status: 502 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const artists: any[] = Array.isArray(item?.artists) ? item.artists : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images: any[] = Array.isArray(item?.album?.images) ? item.album.images : [];
    return Response.json({
      title: String(item?.name ?? ""),
      artist: artists
        .map((a) => String(a?.name ?? "").trim())
        .filter(Boolean)
        .join(", "),
      album: String(item?.album?.name ?? ""),
      durationSec: Math.round(Number(item?.duration_ms ?? 0) / 1000) || 0,
      artwork: images.length > 0 ? String(images[0]?.url ?? "") || null : null,
      isrc: item?.external_ids?.isrc ? String(item.external_ids.isrc) : null,
    });
  } catch {
    return Response.json({ error: "sp-search-failed" }, { status: 502 });
  }
}
