import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 250 * 1024 * 1024;
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = (searchParams.get("url") || "").trim();
    if (!target || !(target.startsWith("http://") || target.startsWith("https://"))) {
      return NextResponse.json({ error: "bad-url" }, { status: 400 });
    }
    const upstream = await fetch(target, { headers: { "User-Agent": UA } });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "fetch-failed" }, { status: 502 });
    }
    const type = upstream.headers.get("content-type") || "audio/mpeg";
    const lower = type.toLowerCase();
    if (!(lower.includes("audio") || lower.includes("mpeg") || lower.includes("ogg") || lower.includes("mp4"))) {
      return NextResponse.json({ error: "not-audio" }, { status: 415 });
    }
    const len = Number(upstream.headers.get("content-length") || 0);
    if (len > MAX_BYTES) {
      return NextResponse.json({ error: "too-large" }, { status: 413 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": "attachment",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch-failed" }, { status: 502 });
  }
}
