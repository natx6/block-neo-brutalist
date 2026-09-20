"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BottomNav, MiniPlayer, Icon } from "./components/Nav";
import AppIcon from "./components/AppIcon";
import { listTracks, recentTracks, type SavedTrack } from "../lib/db";
import { loadSettings, saveSaavnTrack } from "../lib/downloads";
import { fetchCharts, GENRES, type ChartSong } from "../lib/charts";
import { searchSaavn, streamUrl, type SaavnResult } from "../lib/saavn";
import { usePlayer } from "../lib/player-context";

const MOODS = [
  { title: "Happy", sub: "Sun-kissed beats", bg: "bg-[#FFF2B2]", dot: "bg-[#FFE580]", text: "text-[#574400]", subText: "text-[#7A6000]", icon: "sunny", href: "/search?q=feel%20good%20hits" },
  { title: "Cozy", sub: "Warm hot cocoa", bg: "bg-[#FFD6B8]", dot: "bg-[#FFBE94]", text: "text-[#5A2B0F]", subText: "text-[#7B3F1B]", icon: "coffee", href: "/search?q=cozy%20acoustic" },
  { title: "Focus", sub: "Gentle flow state", bg: "bg-[#C7F5DC]", dot: "bg-[#A8ECC4]", text: "text-[#144D32]", subText: "text-[#1E6B47]", icon: "spa", href: "/search?q=deep%20focus" },
  { title: "Dreamy", sub: "Bedtime melodies", bg: "bg-[#E2D4FF]", dot: "bg-[#CFBCFA]", text: "text-[#352561]", subText: "text-[#4A387E]", icon: "bedtime", href: "/search?q=sleep%20sounds" },
];

function chartKey(c: ChartSong) {
  return `${c.title}|${c.artist}`;
}

export default function Home() {
  const [recent, setRecent] = useState<SavedTrack[]>([]);
  const [artFail, setArtFail] = useState<Set<string>>(new Set());
  const { current, playing, play, preview, toggle } = usePlayer();

  const [genre, setGenre] = useState("");
  const [charts, setCharts] = useState<ChartSong[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartArtFail, setChartArtFail] = useState<Set<string>>(new Set());
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [unplayable, setUnplayable] = useState<Set<string>>(new Set());
  const matchCache = useRef(new Map<string, SaavnResult>());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [dlProg, setDlProg] = useState<Record<string, number>>({});
  const [moreArtist, setMoreArtist] = useState("");
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

  const fetchChartSongs = useCallback(async (g: string) => {
    setChartsLoading(true);
    try {
      setCharts(await fetchCharts(g, 15));
    } catch {
      setCharts([]);
    } finally {
      setChartsLoading(false);
    }
  }, []);

  const fetchMore = useCallback(async () => {
    let tracks: SavedTrack[] = [];
    try {
      tracks = await listTracks();
    } catch {
      return;
    }
    setSavedIds(new Set(tracks.map((t) => t.id)));
    const counts = new Map<string, { name: string; n: number }>();
    for (const t of tracks) {
      const name = (t.artist || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const prev = counts.get(key);
      counts.set(key, { name, n: (prev?.n || 0) + 1 });
    }
    let top = "";
    let topN = 0;
    for (const { name, n } of counts.values()) {
      if (n > topN) {
        topN = n;
        top = name;
      }
    }
    if (!top) {
      setMoreArtist("");
      setMoreTracks([]);
      return;
    }
    setMoreArtist(top);
    setMoreLoading(true);
    try {
      setMoreTracks(await searchSaavn(top, 10));
    } catch {
      setMoreTracks([]);
    } finally {
      setMoreLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchChartSongs(genre);
    fetchMore();
    const onFocus = () => {
      refresh();
      fetchChartSongs(genre);
      fetchMore();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, fetchChartSongs, fetchMore, genre]);

  const matchChart = useCallback(async (c: ChartSong): Promise<SaavnResult | null> => {
    const key = chartKey(c);
    const cached = matchCache.current.get(key);
    if (cached) return cached;
    setMatchingId(key);
    try {
      const res = await searchSaavn(`${c.title} ${c.artist}`, 5);
      const m = res[0] ?? null;
      if (m) {
        matchCache.current.set(key, m);
        return m;
      }
      setUnplayable((prev) => new Set(prev).add(key));
      return null;
    } catch {
      setUnplayable((prev) => new Set(prev).add(key));
      return null;
    } finally {
      setMatchingId(null);
    }
  }, []);

  const handlePreviewChart = async (c: ChartSong) => {
    const key = chartKey(c);
    if (matchingId) return;
    let m = matchCache.current.get(key);
    if (!m) {
      m = (await matchChart(c)) ?? undefined;
      if (!m) return;
    }
    const id = `saavn-${m.id}`;
    if (current?.id === id) {
      await toggle();
      return;
    }
    try {
      await preview(
        {
          id,
          title: m.title,
          artist: m.artist,
          durationSec: m.durationSec,
          icon: "music_note",
          bg: "#FFE0D6",
          artwork: m.artwork,
          album: m.album,
          source: "saavn",
          sourceId: m.id,
        },
        streamUrl(m, loadSettings().quality)
      );
    } catch {}
  };

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

  const handleSaveChart = async (c: ChartSong) => {
    const key = chartKey(c);
    let m = matchCache.current.get(key);
    if (!m) {
      if (matchingId) return;
      m = (await matchChart(c)) ?? undefined;
      if (!m) return;
    }
    await handleSaveSaavn(m);
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

        <div className="mt-4">
          <div className="px-5 flex items-center justify-between mb-2">
            <p className="font-display font-bold text-[22px]">Trending now</p>
          </div>
          <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar">
            {GENRES.map((g) => {
              const active = genre === g.id;
              return (
                <button
                  key={g.label}
                  onClick={() => setGenre(g.id)}
                  className={`h-9 px-4 rounded-full font-display font-bold text-[13px] shrink-0 min-h-[36px] ${
                    active ? "t-primary clay-button-active" : "t-card clay-card"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
          {chartsLoading && charts.length === 0 ? (
            <p className="text-[13px] font-bold t-muted px-5">Catching today&apos;s hits...</p>
          ) : charts.length === 0 ? (
            <p className="text-[13px] font-bold t-muted px-5">Nothing trending right now.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto px-5 pb-3 pt-1 no-scrollbar">
              {charts.map((c) => {
                const key = chartKey(c);
                const m = matchCache.current.get(key);
                const savedKey = m ? `saavn-${m.id}` : null;
                const isCurrent = !!(savedKey && current?.id === savedKey && playing);
                const showArt = !!c.artwork && !chartArtFail.has(key);
                const isSaved = !!(savedKey && savedIds.has(savedKey));
                const prog = savedKey ? dlProg[savedKey] : undefined;
                const isDownloading = prog !== undefined;
                const isMatching = matchingId === key;
                const notAvailable = unplayable.has(key);
                return (
                  <div key={key} className="flex flex-col gap-2 shrink-0 w-[140px] text-left">
                    <div className="relative w-[140px] h-[140px] rounded-[28px] p-2 clay-card t-card flex items-center justify-center">
                      <button
                        onClick={() => handlePreviewChart(c)}
                        aria-label={`Play ${c.title}`}
                        className="w-full h-full rounded-[20px] overflow-hidden relative"
                      >
                        {showArt ? (
                          <img
                            src={c.artwork as string}
                            alt=""
                            className="w-full h-full rounded-[20px] object-cover"
                            onError={() => setChartArtFail((prev) => new Set(prev).add(key))}
                          />
                        ) : (
                          <div className="w-full h-full rounded-[20px] bg-white/70 flex items-center justify-center text-[#4c3f70]">
                            <Icon name="music_note" fill className="text-[56px]" />
                          </div>
                        )}
                        {isMatching && (
                          <span className="absolute inset-0 rounded-[20px] bg-white/70 flex items-center justify-center">
                            <span className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handlePreviewChart(c)}
                        aria-label={isCurrent ? `Pause ${c.title}` : `Play ${c.title}`}
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
                              strokeDashoffset={106.8 * (1 - (prog ?? 0) / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[8px] font-bold">{prog}%</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSaveChart(c)}
                          aria-label={`Download ${c.title}`}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full t-card clay-thumb flex items-center justify-center"
                        >
                          <Icon name="download" className="text-[18px]" />
                        </button>
                      )}
                    </div>
                    <button onClick={() => handlePreviewChart(c)} className="px-1 text-left">
                      <p className="font-display font-bold text-[14px] truncate">{c.title}</p>
                      <p className="text-[12px] t-muted truncate">
                        {isMatching ? "Matching..." : c.artist}
                      </p>
                      {notAvailable && (
                        <p className="text-[11px] font-bold t-muted">Not available to stream</p>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {chartsLoading && charts.length > 0 && (
            <p className="text-[12px] font-bold t-muted px-5 pb-1">Catching today&apos;s hits...</p>
          )}
        </div>

        {moreArtist !== "" && (
          <div className="mt-4">
            <div className="px-5 flex items-center justify-between mb-2">
              <p className="font-display font-bold text-[22px]">More like {moreArtist}</p>
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
          {recent.length === 0 ? (
            <div className="px-5">
              <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full t-primary-ct clay-thumb flex items-center justify-center mb-2">
                  <Icon name="cloud" fill className="text-[28px]" />
                </div>
                <p className="font-display font-bold text-[18px]">Your stash is empty</p>
                <p className="text-[13px] t-muted mt-1">Import audio from your device and it will live here.</p>
                <Link href="/offline" className="mt-3 h-11 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center min-h-[44px]">
                  Add music
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto px-5 pb-3 pt-1 no-scrollbar">
              {recent.map((t) => {
                const isCurrent = current?.id === t.id && playing;
                const showArt = !!t.artwork && !artFail.has(t.id);
                return (
                  <button key={t.id} onClick={() => play(t.id)} className="flex flex-col gap-2 shrink-0 w-[140px] text-left active:scale-95 transition-transform">
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
