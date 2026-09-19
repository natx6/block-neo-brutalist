export interface SpCreds {
  clientId: string;
  clientSecret: string;
}

export interface SpCanonical {
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  artwork: string | null;
  isrc: string | null;
}

export const SPOT_CREDS_KEY = "puff-spotify-creds";

export function loadSpCreds(): SpCreds | null {
  try {
    const raw = localStorage.getItem(SPOT_CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SpCreds>;
    const clientId = String(parsed?.clientId ?? "").trim();
    const clientSecret = String(parsed?.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret };
  } catch {
    return null;
  }
}

export function saveSpCreds(creds: SpCreds): void {
  try {
    localStorage.setItem(
      SPOT_CREDS_KEY,
      JSON.stringify({
        clientId: creds.clientId.trim(),
        clientSecret: creds.clientSecret.trim(),
      })
    );
  } catch {}
}

export function clearSpCreds(): void {
  try {
    localStorage.removeItem(SPOT_CREDS_KEY);
  } catch {}
}

export async function spCanonical(query: string): Promise<SpCanonical | null> {
  const creds = loadSpCreds();
  if (!creds) return null;
  const q = query.trim();
  if (!q) return null;
  const res = await fetch("/api/sp/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: q, ...creds }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || typeof json.title !== "string") return null;
  return {
    title: String(json.title ?? ""),
    artist: String(json.artist ?? ""),
    album: String(json.album ?? ""),
    durationSec: typeof json.durationSec === "number" ? json.durationSec : 0,
    artwork: typeof json.artwork === "string" ? json.artwork : null,
    isrc: typeof json.isrc === "string" ? json.isrc : null,
  };
}
