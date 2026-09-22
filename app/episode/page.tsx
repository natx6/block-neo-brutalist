"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon, MiniPlayer, BottomNav } from "../components/Nav";
import { fmtTime } from "../../lib/catalog";
import { listTracks } from "../../lib/db";
import { loadSettings, savePodcastEp } from "../../lib/downloads";
import { getPodcastShow, type PodcastEp, type PodcastShow } from "../../lib/podcasts";
import { usePlayer } from "../../lib/player-context";

function shortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function toSeconds(hms: string): number {
  const parts = hms.split(":").map(Number);
  if (parts.some((n) => !isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

// Split a description into text + tappable timestamp chips.
function renderDescription(
  text: string,
  onJump: (sec: number, label: string) => void
): React.ReactNode[] {
  const re = /(\d{1,3}:\d{2}(?::\d{2})?)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const label = m[1];
    const sec = toSeconds(label);
    out.push(
      <button
        key={k++}
        type="button"
        onClick={() => onJump(sec, label)}
        className="inline-block px-2 py-0.5 mx-0.5 rounded-full t-primary-ct font-display font-bold text-[12px] clay-thumb min-h-[28px]"
      >
        {label}
      </button>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  if (!out.length) out.push(text);
  return out;
}

function EpisodeContent() {
  const params = useSearchParams();
  const showId = params.get("show") || "";
  const epId = params.get("ep") || "";
  const { current, playing, preview, toggle, seek, duration } = usePlayer();
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [ep, setEp] = useState<PodcastEp | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savePct, setSavePct] = useState<number | null>(null);
  const [jumpMsg, setJumpMsg] = useState<string | null>(null);

  const key = `pod-${epId}`;

  const refreshSaved = useCallback(async () => {
    try {
      setIsSaved((await listTracks()).some((t) => t.id === key));
    } catch {}
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    refreshSaved();
    getPodcastShow(showId)
      .then(({ show: s, episodes: eps }) => {
        if (cancelled) return;
        const found = eps.find((e) => e.id === epId) ?? null;
        setShow(s);
        setEp(found);
        if (!s || !found) setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showId, epId, refreshSaved]);

  useEffect(() => {
    if (!jumpMsg) return;
    const t = setTimeout(() => setJumpMsg(null), 1800);
    return () => clearTimeout(t);
  }, [jumpMsg]);

  function meta() {
    if (!show || !ep) throw new Error("not loaded");
    return {
      id: key,
      title: ep.title,
      artist: show.artist || show.title,
      durationSec: ep.durationSec,
      icon: "podcasts",
      bg: "#D6F0FF",
      artwork: ep.artwork || show.artwork,
      source: "podcast" as const,
      sourceId: ep.id,
      audioUrl: ep.audioUrl,
      description: ep.description,
      podcastTitle: show.title,
    };
  }

  const ensurePlaying = async (): Promise<boolean> => {
    if (!show || !ep) return false;
    if (current?.id === key) return true;
    try {
      await preview(meta(), ep.audioUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handlePlay = async () => {
    if (current?.id === key) {
      await toggle();
      return;
    }
    await ensurePlaying();
  };

  const handleJump = async (sec: number, label: string) => {
    const ok = await ensurePlaying();
    if (!ok) return;
    // Give the fresh stream a beat to expose metadata, then seek.
    setTimeout(() => {
      seek(sec);
      setJumpMsg(`Jumped to ${label}`);
    }, 900);
    void duration;
  };

  const handleSave = async () => {
    if (!show || !ep || isSaved || savePct !== null) return;
    try {
      setSavePct(0);
      await savePodcastEp(show, ep, loadSettings().quality, (p) => setSavePct(p));
      await refreshSaved();
    } catch {}
    finally {
      setSavePct(null);
    }
  };

  const art = ep?.artwork || show?.artwork;

  return (
    <div className="t-bg h-dvh w-full flex flex-col relative overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe t-bg">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center gap-2">
          <Link
            href={showId ? `/podcast?id=${encodeURIComponent(showId)}` : "/search"}
            aria-label="Back"
            className="w-11 h-11 rounded-full t-container clay-card flex items-center justify-center min-w-[44px]"
          >
            <Icon name="arrow_back" />
          </Link>
          <h1 className="font-display font-bold text-[18px] truncate">Episode</h1>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-[430px] mx-auto pt-[calc(4rem+env(safe-area-inset-top))] pb-[150px] px-5 flex flex-col gap-4 overflow-y-auto overscroll-contain">
        <div className="pt-3" />
        {loading ? (
          <div className="w-full py-8 flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full t-primary-ct animate-bounce" />
              <span className="w-3.5 h-3.5 rounded-full t-secondary-ct animate-bounce [animation-delay:150ms]" />
              <span className="w-3.5 h-3.5 rounded-full bg-[var(--tertiary-ct)] animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-[13px] font-bold t-muted">Loading episode...</p>
          </div>
        ) : failed || !show || !ep ? (
          <div className="w-full py-8 flex flex-col items-center text-center">
            <p className="font-display font-bold text-[18px]">Episode not found</p>
            <p className="text-[13px] t-muted">Try opening it from the show again.</p>
          </div>
        ) : (
          <>
            <div className="w-full t-card rounded-[28px] p-4 clay-card flex flex-col items-center text-center gap-2">
              {art && !artFailed ? (
                <img
                  src={art}
                  alt=""
                  className="w-full max-w-[200px] aspect-square rounded-[18px] object-cover clay-thumb"
                  onError={() => setArtFailed(true)}
                />
              ) : (
                <div className="w-full max-w-[200px] aspect-square rounded-[18px] t-container clay-thumb flex items-center justify-center">
                  <Icon name="podcasts" fill className="text-[56px]" />
                </div>
              )}
              <div>
                <h2 className="font-display font-bold text-[20px] leading-tight">{ep.title}</h2>
                <p className="font-bold text-[14px] t-muted mt-0.5">{show.title}</p>
                <p className="text-[12px] t-muted mt-0.5">
                  {shortDate(ep.date)}
                  {shortDate(ep.date) && ep.durationSec ? " • " : ""}
                  {ep.durationSec ? fmtTime(ep.durationSec) : ""}
                </p>
                {jumpMsg ? (
                  <p className="text-[12px] font-bold t-primary-text mt-1">{jumpMsg}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePlay}
                  className="h-12 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center gap-2 min-h-[48px]"
                >
                  <Icon name={current?.id === key && playing ? "pause" : "play_arrow"} fill />
                  {current?.id === key && playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaved || savePct !== null}
                  className="h-12 px-6 rounded-full t-secondary-ct font-display font-bold text-[14px] clay-thumb flex items-center gap-2 min-h-[48px] disabled:opacity-60"
                >
                  <Icon name={isSaved ? "check" : "download"} />
                  {savePct !== null ? `${savePct}%` : isSaved ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            {ep.description ? (
              <div className="w-full t-surface rounded-2xl p-4 clay-card">
                <p className="font-display font-bold text-[14px] mb-2">Description</p>
                <p className="text-[13px] t-muted leading-relaxed whitespace-pre-wrap">
                  {renderDescription(ep.description, (sec, label) => handleJump(sec, label))}
                </p>
                <p className="text-[11px] t-muted mt-2 font-bold">Tap a timestamp to jump there.</p>
              </div>
            ) : null}
          </>
        )}
      </main>
      <MiniPlayer />
      <BottomNav active="" />
    </div>
  );
}

export default function EpisodePage() {
  return (
    <Suspense
      fallback={
        <div className="t-bg h-dvh w-full flex flex-col items-center justify-center">
          <p className="font-display font-bold t-muted">Loading episode...</p>
        </div>
      }
    >
      <EpisodeContent />
    </Suspense>
  );
}
