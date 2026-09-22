"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav, Icon, MiniPlayer } from "../components/Nav";
import { fmtTime } from "../../lib/catalog";
import { listTracks } from "../../lib/db";
import { loadSettings, savePodcastEp } from "../../lib/downloads";
import { getPodcastShow, type PodcastEp, type PodcastShow } from "../../lib/podcasts";
import { usePlayer, type SessionQueueItem } from "../../lib/player-context";

function shortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function PodcastContent() {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const { current, playing, preview } = usePlayer();
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEp[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dlProg, setDlProg] = useState<Record<string, number>>({});
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  function shortDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  }

  const refreshSaved = useCallback(async () => {
    try {
      setSavedIds(new Set((await listTracks()).map((t) => t.id)));
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    refreshSaved();
    getPodcastShow(id)
      .then(({ show: s, episodes: eps }) => {
        if (cancelled) return;
        setShow(s);
        setEpisodes(eps);
        if (!s) setFailed(true);
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
  }, [id, refreshSaved]);

  function podMeta(s: PodcastShow, ep: PodcastEp) {
    return {
      id: `pod-${ep.id}`,
      title: ep.title,
      artist: s.artist || s.title,
      durationSec: ep.durationSec,
      icon: "podcasts",
      bg: "#D6F0FF",
      artwork: ep.artwork || s.artwork,
      source: "podcast" as const,
      sourceId: ep.id,
      audioUrl: ep.audioUrl,
      description: ep.description,
      podcastTitle: s.title,
    };
  }

  function queueFrom(list: PodcastEp[], s: PodcastShow): SessionQueueItem[] {
    return list
      .filter((e) => e.audioUrl)
      .map((e) => ({ meta: podMeta(s, e), url: e.audioUrl }));
  }

  const handleSave = async (ep: PodcastEp) => {
    if (!show) return;
    const key = `pod-${ep.id}`;
    if (savedIds.has(key) || dlProg[key] !== undefined) return;
    setDlProg((prev) => ({ ...prev, [key]: 0 }));
    try {
      await savePodcastEp(show, ep, loadSettings().quality, (p) =>
        setDlProg((prev) => ({ ...prev, [key]: p }))
      );
      await refreshSaved();
    } catch {}
    setDlProg((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handlePlayAll = async () => {
    if (!show || !episodes.length || previewingId) return;
    const queue = queueFrom(episodes, show);
    if (!queue.length) return;
    setPreviewingId(queue[0].meta.id);
    try {
      await preview(queue[0].meta, queue[0].url, queue.length > 1 ? queue : undefined);
    } catch {}
    finally {
      setPreviewingId(null);
    }
  };

  return (
    <div className="t-bg h-dvh w-full flex flex-col relative overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe t-bg">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center gap-2">
          <Link href="/search" aria-label="Back to search" className="w-11 h-11 rounded-full t-container clay-card flex items-center justify-center min-w-[44px]">
            <Icon name="arrow_back" />
          </Link>
          <h1 className="font-display font-bold text-[18px] truncate">Podcast</h1>
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
            <p className="text-[13px] font-bold t-muted">Loading show...</p>
          </div>
        ) : failed || !show ? (
          <div className="w-full py-8 flex flex-col items-center text-center">
            <p className="font-display font-bold text-[18px]">Show not found</p>
            <p className="text-[13px] t-muted">Try searching again.</p>
            <Link href="/search" className="mt-3 h-11 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center min-h-[44px]">
              Back to Search
            </Link>
          </div>
        ) : (
          <>
            <div className="w-full t-card rounded-[28px] p-4 clay-card flex flex-col items-center text-center gap-2">
              {show.artwork && !artFailed ? (
                <img
                  src={show.artwork}
                  alt=""
                  className="w-full max-w-[180px] aspect-square rounded-[18px] object-cover clay-thumb"
                  onError={() => setArtFailed(true)}
                />
              ) : (
                <div className="w-full max-w-[180px] aspect-square rounded-[18px] t-container clay-thumb flex items-center justify-center">
                  <Icon name="podcasts" fill className="text-[56px]" />
                </div>
              )}
              <div>
                <h2 className="font-display font-bold text-[20px] leading-tight">{show.title}</h2>
                <p className="font-bold text-[14px] t-muted mt-0.5">{show.artist}</p>
                {show.genre ? (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full t-primary-ct font-display font-bold text-[11px] uppercase tracking-wide">
                    {show.genre}
                  </span>
                ) : null}
              </div>
              <button
                onClick={handlePlayAll}
                disabled={!episodes.length}
                className="h-12 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center gap-2 min-h-[48px] disabled:opacity-50"
              >
                <Icon name="play_arrow" fill />
                Play all ({episodes.length})
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="font-display font-bold text-[18px]">Episodes</span>
              <span className="font-display font-bold text-[12px] t-variant px-2.5 py-0.5 rounded-full clay-thumb">
                {episodes.length}
              </span>
            </div>

            {episodes.length === 0 ? (
              <p className="text-[13px] font-bold t-muted px-1">No episodes found.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {episodes.map((ep) => {
                  const key = `pod-${ep.id}`;
                  const isSaved = savedIds.has(key);
                  const prog = dlProg[key];
                  const isDownloading = prog !== undefined;
                  const isCurrent = current?.id === key && playing;
                  const isPreviewing = previewingId === key;
                  return (
                    <div
                      key={ep.id}
                      className="w-full t-card p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left"
                    >
                      <Link
                        href={`/episode?show=${encodeURIComponent(show.id)}&ep=${encodeURIComponent(ep.id)}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="font-display font-bold text-[14px]">{ep.title}</p>
                        <p className="text-[12px] t-muted">
                          {isPreviewing
                            ? "Loading..."
                            : `${shortDate(ep.date)}${shortDate(ep.date) && ep.durationSec ? " • " : ""}${ep.durationSec ? fmtTime(ep.durationSec) : ""}`}
                        </p>
                        {ep.description ? (
                          <p className="text-[11px] t-muted truncate mt-0.5">{ep.description.slice(0, 300)}</p>
                        ) : null}
                      </Link>
                      {isSaved ? (
                        <span aria-label="Saved" className="w-11 h-11 rounded-full bg-[#c7f5dc] clay-thumb flex items-center justify-center shrink-0 text-[#144d32]">
                          <Icon name="check" />
                        </span>
                      ) : isDownloading ? (
                        <span className="relative w-11 h-11 rounded-full t-card clay-thumb flex items-center justify-center shrink-0">
                          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="17" stroke="#eedbff" strokeWidth="4" fill="none" />
                            <circle
                              cx="22"
                              cy="22"
                              r="17"
                              stroke="#306385"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray="106.8"
                              strokeDashoffset={106.8 * (1 - prog / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-bold">{prog}%</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Download ${ep.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave(ep);
                          }}
                          className="w-11 h-11 rounded-full t-tertiary-ct clay-thumb flex items-center justify-center shrink-0"
                        >
                          <Icon name={isCurrent ? "pause" : "download"} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {show.description ? (
              <div className="w-full t-surface rounded-2xl p-4 clay-card">
                <p className="font-display font-bold text-[14px] mb-1">About</p>
                <p className="text-[13px] t-muted leading-relaxed">{show.description}</p>
              </div>
            ) : null}
          </>
        )}
      </main>
      <MiniPlayer />
      <BottomNav active="search" />
    </div>
  );
}

export default function PodcastPage() {
  return (
    <Suspense
      fallback={
        <div className="t-bg h-dvh w-full flex flex-col items-center justify-center">
          <p className="font-display font-bold t-muted">Loading show...</p>
        </div>
      }
    >
      <PodcastContent />
    </Suspense>
  );
}
