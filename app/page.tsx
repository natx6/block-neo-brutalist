"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BottomNav, MiniPlayer, Icon } from "./components/Nav";
import AppIcon from "./components/AppIcon";
import { getTrack, listTracks, recentTracks, type SavedTrack } from "../lib/db";
import { loadSettings, saveFileTracks, saveSaavnTrack } from "../lib/downloads";
import { searchSaavn, streamUrl, type SaavnResult } from "../lib/saavn";
import { usePlayer } from "../lib/player-context";

const MOODS = [
  { title: "Happy", sub: "Sun-kissed beats", bg: "bg-[#FFF2B2]", dot: "bg-[#FFE580]", text: "text-[#574400]", subText: "text-[#7A6000]", icon: "sunny", href: "/search?q=feel%20good%20hits" },
  { title: "Cozy", sub: "Warm hot cocoa", bg: "bg-[#FFD6B8]", dot: "bg-[#FFBE94]", text: "text-[#5A2B0F]", subText: "text-[#7B3F1B]", icon: "coffee", href: "/search?q=cozy%20acoustic" },
  { title: "Focus", sub: "Gentle flow state", bg: "bg-[#C7F5DC]", dot: "bg-[#A8ECC4]", text: "text-[#144D32]", subText: "text-[#1E6B47]", icon: "spa", href: "/search?q=deep%20focus" },
  { title: "Dreamy", sub: "Bedtime melodies", bg: "bg-[#E2D4FF]", dot: "bg-[#CFBCFA]", text: "text-[#352561]", subText: "text-[#4A387E]", icon: "bedtime", href: "/search?q=sleep%20sounds" },
];

export default function Home() {
  const [recent, setRecent] = useState<SavedTrack[]>([]);
  const [artFail, setArtFail] = useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { current, playing, play, preview, toggle, history } = usePlayer();

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dlProg, setDlProg] = useState<Record<string, number>>({});
  const [moreArtists, setMoreArtists] = useState<string[]>([]);
  const [moreTracks, setMoreTracks] = useState<SaavnResult[]>([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreArtFail, setMoreArtFail] = useState<Set<string>>(new Set());

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const refresh = useCallback(async () => {
    try {
      setRecent(await recentTracks(4));
    } catch {}
  }, []);

  // Tap a history row: saved tracks play from the stash, previews re-stream.
  const playOrPreview = useCallback(
    async (meta: (typeof history)[number]) => {
      if (current?.id === meta.id) {
        await toggle();
        return;
      }
      try {
        const saved = await getTrack(meta.id).catch(() => undefined);
        if (saved) {
          await play(meta.id);
          return;
        }
      } catch {}
    if (meta.streamUrl) {
        try {
          await preview(meta, meta.streamUrl);
        } catch {}
      }
    },
    [current, play, preview, toggle]
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const count = files.length;
    setImportStatus("Importing...");
    try {
      await saveFileTracks(files, loadSettings().quality);
      setImportStatus(`Saved ${count} song(s)`);
      await refresh();
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Import failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  // Session history first (includes previews), saved recents as fallback.
  const recentRows =
    history.length > 0
      ? history.slice(0, 8)
      : recent.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          durationSec: t.durationSec,
          icon: t.icon,
          bg: t.bg,
          artwork: t.artwork ?? null,
          streamUrl: null as string | null,
        }));

  const fetchMore = useCallback(async () => {
    let tracks: SavedTrack[] = [];
    try {
      tracks = await listTracks();
    } catch {
      return;
    }
    const savedSet = new Set(tracks.map((t) => t.id));
    setSavedIds(savedSet);
    const scores = new Map<string, { name: string; score: number }>();
    for (const t of tracks) {
      const name = (t.artist || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const prev = scores.get(key);
      scores.set(key, { name, score: (prev?.score || 0) + 1 + (t.playCount || 0) });
    }
    const top = [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    if (!top.length) {
      setMoreArtists([]);
      setMoreTracks([]);
      return;
    }
    setMoreArtists(top.map((t) => t.name));
    setMoreLoading(true);
    try {
      const per = await Promise.all(top.map((t) => searchSaavn(t.name, 6).catch(() => [] as SaavnResult[])));
      const seen = new Set<string>();
      const merged: SaavnResult[] = [];
      for (const list of per) {
        for (const r of list) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          if (savedSet.has(`saavn-${r.id}`)) continue;
          merged.push(r);
        }
      }
      setMoreTracks(merged.slice(0, 10));
    } catch {
      setMoreTracks([]);
    } finally {
      setMoreLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchMore();
    const onFocus = () => {
      refresh();
      fetchMore();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, fetchMore]);

  const handlePreviewSaavn = async (r: SaavnResult) => {
    const id = `saavn-${r.id}`;
    if (current?.id === id) {
      await toggle();
      return;
    }
    try {
      await preview(
        {
          id,
          title: r.title,
          artist: r.artist,
          durationSec: r.durationSec,
          icon: "music_note",
          bg: "#FFE0D6",
          artwork: r.artwork,
          album: r.album,
          year: r.year,
          source: "saavn",
          sourceId: r.id,
        },
        streamUrl(r, loadSettings().quality)
      );
    } catch {}
  };

  const handleSaveSaavn = async (r: SaavnResult) => {
    const key = `saavn-${r.id}`;
    if (savedIds.has(key) || dlProg[key] !== undefined) return;
    setDlProg((prev) => ({ ...prev, [key]: 0 }));
    try {
      await saveSaavnTrack(r, loadSettings().quality, (p) =>
        setDlProg((prev) => ({ ...prev, [key]: p }))
      );
      try {
        setSavedIds(new Set((await listTracks()).map((t) => t.id)));
      } catch {}
    } catch {}
    setDlProg((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="t-bg h-dvh max-w-[430px] mx-auto flex flex-col relative overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe t-bg">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppIcon className="w-9 h-9 rounded-2xl clay-thumb" />
            <span className="font-display font-bold text-[22px]">Puff</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" aria-label="Settings" className="w-11 h-11 rounded-full t-container clay-card flex items-center justify-center t-primary-text min-w-[44px]">
              <Icon name="settings" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 pt-[calc(4rem+env(safe-area-inset-top))] pb-[144px] overflow-y-auto overscroll-contain">
        <div className="px-5 pt-3">
          <p className="font-display font-bold text-[18px]">{greeting}</p>
        </div>

        {moreArtists.length > 0 && (
          <div className="mt-4">
            <div className="px-5 flex items-center justify-between mb-2">
              <div className="min-w-0">
                <p className="font-display font-bold text-[22px]">Picked for you</p>
                <p className="text-[12px] t-muted truncate">{moreArtists.join(" • ")}</p>
              </div>
            </div>
            {moreLoading && moreTracks.length === 0 ? (
              <p className="text-[13px] font-bold t-muted px-5">Catching today&apos;s hits...</p>
            ) : moreTracks.length === 0 ? null : (
              <div className="flex gap-4 overflow-x-auto px-5 pb-3 pt-1 no-scrollbar">
                {moreTracks.map((r) => {
                  const id = `saavn-${r.id}`;
                  const isCurrent = current?.id === id && playing;
                  const showArt = !!r.artwork && !moreArtFail.has(r.id);
                  const isSaved = savedIds.has(id);
                  const prog = dlProg[id];
                  const isDownloading = prog !== undefined;
                  return (
                    <div key={r.id} className="flex flex-col gap-2 shrink-0 w-[140px] text-left">
                      <div className="relative w-[140px] h-[140px] rounded-[28px] p-2 clay-card t-card flex items-center justify-center">
                        {showArt ? (
                          <img
                            src={r.artwork as string}
                            alt=""
                            className="w-full h-full rounded-[20px] object-cover"
                            onError={() => setMoreArtFail((prev) => new Set(prev).add(r.id))}
                          />
                        ) : (
                          <div className="w-full h-full rounded-[20px] bg-white/70 flex items-center justify-center text-[#4c3f70]">
                            <Icon name="music_note" fill className="text-[56px]" />
                          </div>
                        )}
                        <button
                          onClick={() => handlePreviewSaavn(r)}
                          aria-label={isCurrent ? `Pause ${r.title}` : `Play ${r.title}`}
                          className="absolute bottom-3 right-3 w-9 h-9 rounded-full t-primary clay-thumb flex items-center justify-center"
                        >
                          <Icon name={isCurrent ? "pause" : "play_arrow"} fill className="text-[20px]" />
                        </button>
                        {isSaved ? (
                          <span aria-label="Saved" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#c7f5dc] clay-thumb flex items-center justify-center text-[#144d32]">
                            <Icon name="check" className="text-[18px]" />
                          </span>
                        ) : isDownloading ? (
                          <span className="absolute top-3 right-3 w-8 h-8 rounded-full t-container clay-thumb flex items-center justify-center">
                            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 44 44">
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
                            <span className="absolute text-[8px] font-bold">{prog}%</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSaveSaavn(r)}
                            aria-label={`Download ${r.title}`}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full t-card clay-thumb flex items-center justify-center"
                          >
                            <Icon name="download" className="text-[18px]" />
                          </button>
                        )}
                      </div>
                      <div className="px-1">
                        <p className="font-display font-bold text-[14px] truncate">{r.title}</p>
                        <p className="text-[12px] t-muted truncate">{r.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <div className="px-5 flex items-center justify-between mb-2">
            <p className="font-display font-bold text-[22px]">Recently Played</p>
            <Link href="/library" className="font-display font-bold text-[12px] t-primary-text min-h-[44px] flex items-center">See all</Link>
          </div>
          {recentRows.length === 0 ? (
            <div className="px-5">
              <div className="w-full py-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full t-primary-ct clay-thumb flex items-center justify-center mb-2">
                  <Icon name="cloud" fill className="text-[28px]" />
                </div>
                <p className="font-display font-bold text-[18px]">Nothing played yet</p>
                <p className="text-[13px] t-muted mt-1">Import audio or tap anything to play.</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 h-11 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center gap-1.5 min-h-[44px]"
                >
                  <Icon name="upload" className="text-[20px]" />
                  Import music
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.opus,.weba"
                  multiple
                  tabIndex={-1}
                  aria-hidden
                  className="absolute w-px h-px opacity-0 overflow-hidden pointer-events-none"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                {importStatus && (
                  <p className="text-[12px] font-bold t-muted mt-2">{importStatus}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto px-5 pb-3 pt-1 no-scrollbar">
              {recentRows.map((t) => {
                const isCurrent = current?.id === t.id && playing;
                const showArt = !!t.artwork && !artFail.has(t.id);
                return (
                  <button key={t.id} onClick={() => playOrPreview(t)} className="flex flex-col gap-2 shrink-0 w-[140px] text-left active:scale-95 transition-transform">
                    <div className="relative w-[140px] h-[140px] rounded-[28px] p-2 clay-card flex items-center justify-center" style={{ background: t.bg }}>
                      {showArt ? (
                        <img
                          src={t.artwork as string}
                          alt=""
                          className="w-full h-full rounded-[20px] object-cover"
                          onError={() => setArtFail((prev) => new Set(prev).add(t.id))}
                        />
                      ) : (
                        <div className="w-full h-full rounded-[20px] bg-white/70 flex items-center justify-center text-[#4c3f70]">
                          <Icon name={t.icon} fill className="text-[56px]" />
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full t-primary clay-thumb flex items-center justify-center">
                        <Icon name={isCurrent ? "pause" : "play_arrow"} fill className="text-[20px]" />
                      </div>
                    </div>
                    <div className="px-1">
                      <p className="font-display font-bold text-[14px] truncate">{t.title}</p>
                      <p className="text-[12px] t-muted truncate">{t.artist}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-bold text-[22px]">Moods &amp; Vibes</p>
            <span className="text-[11px] t-muted font-medium">Pick a feeling</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map((m) => (
              <Link key={m.title} href={m.href} className={`${m.bg} h-28 rounded-2xl p-3.5 clay-card flex flex-col justify-between text-left active:scale-95 transition-transform min-h-[112px]`}>
                <div className="flex items-start justify-between">
                  <span className={`w-10 h-10 rounded-full ${m.dot} flex items-center justify-center text-[#231534]`}>
                    <Icon name={m.icon} fill />
                  </span>
                  <Icon name="north_east" className="text-[18px] opacity-50" />
                </div>
                <div>
                  <p className={`font-display font-bold text-[18px] ${m.text}`}>{m.title}</p>
                  <p className={`text-[11px] font-bold ${m.subText}`}>{m.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </main>

      <MiniPlayer />
      <BottomNav active="home" />
    </div>
  );
}
