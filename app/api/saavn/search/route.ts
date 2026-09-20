import { NextRequest, NextResponse } from "next/server";
import CryptoJS from "crypto-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DES_KEY = "38346591";

function unescapeHtml(s: string): string {
  return (
    s
      .replace(/&#039;|&#39;|&apos;/g, "'")
      .replace(/&quot;|&#34;/g, '"')
      .replace(/&lt;|&#60;/g, "<")
      .replace(/&gt;|&#62;/g, ">")
      .replace(/&#(\d+);/g, (_m, n) => {
        try {
          return String.fromCharCode(Number(n));
        } catch {
          return "";
        }
      })
      // &amp; last so double-encoded entities are not decoded twice.
      .replace(/&amp;/g, "&")
  );
}

function decryptUrl(enc: string): string {
  const key = CryptoJS.enc.Utf8.parse(DES_KEY);
  const dec = CryptoJS.DES.decrypt(enc.trim(), key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  const raw = dec.toString(CryptoJS.enc.Utf8);
  if (!raw) return "";
  return raw.replace(/\.mp4.*$/, ".mp4");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function artworkOf(song: any): string | null {
  const img = song?.image;
  if (Array.isArray(img) && img.length > 0) {
    const hi =
      img.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => String(i?.quality ?? "") === "500x500"
      ) ?? img[img.length - 1];
    const url = String(hi?.url ?? hi?.link ?? "");
    return url || null;
  }
  if (typeof img === "string" && img) {
    return img.replace("150x150", "500x500");
  }
  return null;
}

interface SaavnOut {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  year: string;
  artwork: string | null;
  url: string;
  plays: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.max(1, Math.min(25, Number(searchParams.get("limit")) || 12));
    if (!q) return NextResponse.json({ results: [] });

    // Harvest cookies from the homepage first — the API rejects cookieless calls.
    let cookie = "";
    try {
      const home = await fetch("https://www.jiosaavn.com/", {
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      const headers = home.headers as Headers & {
        getSetCookie?: () => string[];
      };
      if (typeof headers.getSetCookie === "function") {
        const parts = headers.getSetCookie();
        if (parts.length) cookie = parts.map((c) => c.split(";")[0]).join("; ");
      } else {
        const single = home.headers.get("set-cookie");
        if (single) cookie = single.split(";")[0];
      }
    } catch {
      // Cookieless fallback — the API call below may still succeed.
    }

    const apiUrl =
      `https://www.jiosaavn.com/api.php?__call=search.getResults` +
      `&q=${encodeURIComponent(q)}&p=1&n=${limit}` +
      `&_format=json&_marker=0&api_version=4&ctx=web6dot0`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    if (!res.ok) throw new Error(`saavn ${res.status}`);
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawResults: any[] = Array.isArray(json?.results) ? json.results : [];

    const results: SaavnOut[] = [];
    for (const s of rawResults) {
      try {
        if (s?.type !== "song") continue;
        const more = s?.more_info || {};
        const enc = String(more.encrypted_media_url || "");
        if (!enc) continue;
        const url = decryptUrl(enc);
        if (!url) continue;
        const primaries = more?.artistMap?.primary_artists;
        const artist =
          (Array.isArray(primaries) && primaries.length
            ? primaries
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((a: any) => String(a?.name || ""))
                .filter(Boolean)
                .join(", ")
            : "") || String(more.music || "Unknown artist");
        results.push({
          id: String(s.id || ""),
          title: unescapeHtml(String(s.title || "Untitled")),
          artist: unescapeHtml(artist),
          album: unescapeHtml(String(more.album || "")),
          durationSec: Number(more.duration) || 0,
          year: String(s.year || more.year || ""),
          artwork: artworkOf(s),
          url,
          plays: Number(s.play_count) || 0,
        });
      } catch {
        continue;
      }
    }
    // Most-played first: the original studio recording dwarfs covers/tributes.
    // Cover-ish versions (karaoke, tributes, instrumentals...) sink to the bottom.
    const COVER_RE = /karaoke|tribute|instrumental|piano|lullaby|nightcore|slowed|originally performed|\(by the|reverb|8d audio|\bcover\b/i;
    const isCover = (r: SaavnOut) => COVER_RE.test(`${r.title} ${r.album} ${r.artist}`);
    results.sort((a, b) => {
      const ca = isCover(a) ? 1 : 0;
      const cb = isCover(b) ? 1 : 0;
      if (ca !== cb) return ca - cb;
      return (b.plays || 0) - (a.plays || 0);
    });
    return NextResponse.json({ results: results.filter((r) => r.id) });
  } catch {
    return NextResponse.json({ error: "saavn-search-failed" }, { status: 502 });
  }
}
