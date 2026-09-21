"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";
import { fmtTime } from "../../lib/catalog";
import { listTracks, type SavedTrack } from "../../lib/db";
import {
  loadSettings,
  savePodcastEp,
  saveSaavnTrack,
} from "../../lib/downloads";
import { searchSaavn, streamUrl, type SaavnResult } from "../../lib/saavn";
import { loadSpCreds, spCanonical, type SpCanonical } from "../../lib/spotify";
import { searchPodcasts, showEpisodes, type PodcastEp, type PodcastShow } from "../../lib/podcasts";
import { usePlayer } from "../../lib/player-context";

// Survives in-app navigation (module singleton): back button restores
// query + results instantly instead of a blank page.
const searchCache: {
  query: string;
  fetchedQuery: string;
  saavn: SaavnResult[];
  canonical: SpCanonical | null;
  scrollY: number;
} = { query: "", fetchedQuery: "", saavn: [], canonical: null, scrollY: 0 };

function saavnMeta(r: SaavnResult) {
  return {
    id: `saavn-${r.id}`,
    title: r.title,
    artist: r.artist,
    durationSec: r.durationSec,
    icon: "music_note",
    bg: "#FFE0D6",
    artwork: r.artwork,
    album: r.album,
    year: r.year,
    source: "saavn" as const,
    sourceId: r.id,
  };
}

export default function SearchPage() {
  const { current, playing, play, preview, toggle } = usePlayer();
  const [query, setQuery] = useState(searchCache.query);
  const [debounced, setDebounced] = useState(searchCache.query.trim());
  const [saved, setSaved] = useState<SavedTrack[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saavnResults, setSaavnResults] = useState<SaavnResult[]>(searchCache.saavn);
  const [searching, setSearching] = useState(false);
  const [saavnUnavailable, setSaavnUnavailable] = useState(false);
  const [saavnImgFail, setSaavnImgFail] = useState<Set<string>>(new Set());
  const [spConnected, setSpConnected] = useState(false);
  const [canonical, setCanonical] = useState<SpCanonical | null>(searchCache.canonical);
  const [dlProg, setDlProg] = useState<Record<string, number>>({});
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [mode, setMode] = useState<"music" | "podcasts">("music");
  const [podShows, setPodShows] = useState<PodcastShow[]>([]);
  const [podSearching, setPodSearching] = useState(false);
  const [podUnavailable, setPodUnavailable] = useState(false);
  const [podImgFail, setPodImgFail] = useState<Set<string>>(new Set());
  const [expandedShow, setExpandedShow] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Record<string, PodcastEp[]>>({});
  const [epsLoading, setEpsLoading] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const refresh = useCallback(async () => {
    try {
      const tracks = await listTracks();
      setSaved(tracks);
      setSavedIds(new Set(tracks.map((t) => t.id)));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && !searchCache.query) setQuery(q);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    // Restore scroll + cached results from last visit.
    if (searchCache.scrollY > 0) {
      const y = searchCache.scrollY;
      requestAnimationFrame(() => mainRef.current?.scrollTo(0, y));
    }
    return () => {
      searchCache.scrollY = mainRef.current?.scrollTop ?? 0;
    };
  }, [refresh]);

  // Persist query + results for back-navigation restores.
  useEffect(() => {
    searchCache.query = query;
  }, [query]);
  useEffect(() => {
    searchCache.saavn = saavnResults;
    searchCache.canonical = canonical;
  }, [saavnResults, canonical]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 600);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "music") return;
    if (!debounced) {
      setSaavnResults([]);
      setSearching(false);
      setSaavnUnavailable(false);
      setCanonical(null);
      searchCache.fetchedQuery = "";
      return;
    }
    // Restored from cache (back navigation): show instantly, no refetch flash.
    if (
      searchCache.fetchedQuery === debounced &&
      searchCache.saavn.length > 0
    ) {
      setSearching(false);
      return;
    }
    setSearching(true);
    setPreviewError("");
    setSaavnUnavailable(false);
    const creds = loadSpCreds();
    setSpConnected(!!creds);
    if (creds) {
      spCanonical(debounced)
        .then((c) => {
          if (!cancelled) setCanonical(c);
        })
        .catch(() => {
          if (!cancelled) setCanonical(null);
        });
    } else {
      setCanonical(null);
    }
    searchSaavn(debounced, 15).then(
      (results) => {
        if (cancelled) return;
        setSaavnResults(results);
        setSaavnUnavailable(false);
        searchCache.fetchedQuery = debounced;
        setSearching(false);
      },
      () => {
        if (cancelled) return;
        setSaavnResults([]);
        setSaavnUnavailable(true);
        searchCache.fetchedQuery = debounced;
        setSearching(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [debounced, mode]);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "podcasts") return;
    if (!debounced) {
      setPodShows([]);
      setPodSearching(false);
      setPodUnavailable(false);
      return;
    }
    setPodSearching(true);
    setPodUnavailable(false);
    searchPodcasts(debounced, 20).then(
      (shows) => {
        if (cancelled) return;
        setPodShows(shows);
        setPodSearching(false);
      },
      () => {
        if (cancelled) return;
        setPodShows([]);
        setPodUnavailable(true);
        setPodSearching(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [debounced, mode]);

  function scoreMatch(r: { title: string; artist: string; durationSec: number }, c: SpCanonical): number {
    let score = 0;
    const resTitle = r.title.toLowerCase();
    const words = c.title.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    if (words.some((w) => resTitle.includes(w))) score += 50;
    if (Math.abs((r.durationSec || 0) - (c.durationSec || 0)) <= 3) score += 30;
    const resArtist = (r.artist || "").toLowerCase();
    const cArtist = (c.artist || "").toLowerCase();
    if (resArtist && cArtist && (resArtist.includes(cArtist) || cArtist.includes(resArtist))) {
      score += 20;
    } else if (resArtist && cArtist) {
      const aWords = cArtist.split(/[\s,&]+/).filter((w) => w.length >= 3);
      if (aWords.some((w) => resArtist.includes(w))) score += 20;
    }
    return score;
  }

  const rankedSaavnResults =
    canonical && spConnected
      ? [...saavnResults].sort((a, b) => scoreMatch(b, canonical) - scoreMatch(a, canonical))
      : saavnResults;
  const showMatchBadge = !!(canonical && spConnected && rankedSaavnResults.length > 0);

  const handleSaveSaavn = async (r: SaavnResult) => {
    const key = `saavn-${r.id}`;
    setDlProg((prev) => ({ ...prev, [key]: 0 }));
    try {
      await saveSaavnTrack(r, loadSettings().quality, (p) =>
        setDlProg((prev) => ({ ...prev, [key]: p }))
      );
      await refresh();
    } catch {}
    setDlProg((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handlePreviewSaavn = async (r: SaavnResult) => {
    const key = r.id;
    if (previewingId) return;
    setPreviewingId(key);
    setPreviewError("");
    try {
      const url = streamUrl(r, loadSettings().quality);
      await preview(saavnMeta(r), url, saavnQueue);
    } catch {
      // Keep the results list intact; show an inline note instead.
      setPreviewError("Couldn't load that preview — try again in a bit.");
    } finally {
      setPreviewingId(null);
    }
  };

  const showingResults = debounced.length > 0;
  const saavnQueue = saavnResults.map((r) => ({
    meta: saavnMeta(r),
    url: streamUrl(r, loadSettings().quality),
  }));

  function podMeta(show: PodcastShow, ep: PodcastEp) {
    return {
      id: `pod-${ep.id}`,
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

  function shortDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  }

  const handleToggleShow = async (show: PodcastShow) => {
    if (expandedShow === show.id) {
      setExpandedShow(null);
      return;
    }
    setExpandedShow(show.id);
    if (episodes[show.id]) return;
    setEpsLoading(show.id);
    try {
      const eps = await showEpisodes(show.id);
      setEpisodes((prev) => ({ ...prev, [show.id]: eps }));
    } catch {
      setEpisodes((prev) => ({ ...prev, [show.id]: [] }));
    } finally {
      setEpsLoading(null);
    }
  };

  const handlePreviewPod = async (show: PodcastShow, ep: PodcastEp) => {
    const id = `pod-${ep.id}`;
    if (current?.id === id) {
      await toggle();
      return;
    }
    if (previewingId) return;
    setPreviewingId(id);
    setPreviewError("");
    try {
      await preview(podMeta(show, ep), ep.audioUrl);
    } catch {
      setPreviewError("Couldn't load that preview — try again in a bit.");
    } finally {
      setPreviewingId(null);
    }
  };

  const handleSavePod = async (show: PodcastShow, ep: PodcastEp) => {
    const key = `pod-${ep.id}`;
    if (savedIds.has(key) || dlProg[key] !== undefined) return;
    setDlProg((prev) => ({ ...prev, [key]: 0 }));
    try {
      await savePodcastEp(show, ep, loadSettings().quality, (p) =>
        setDlProg((prev) => ({ ...prev, [key]: p }))
      );
      await refresh();
    } catch {}
    setDlProg((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="t-bg h-dvh max-w-[430px] mx-auto flex flex-col relative overflow-hidden">
      <TopBar title="Search" />
      <main ref={mainRef} className="flex-1 min-h-0 pt-[calc(4rem+env(safe-area-inset-top))] pb-[144px] px-5 flex flex-col gap-4 overflow-y-auto overscroll-contain">
        <div className="pt-3">
          <div className="flex items-center w-full h-14 t-card rounded-full px-4 clay-card">
            <span className="t-primary-text mr-2 flex items-center">
              <Icon name="search" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "podcasts" ? "Search podcasts..." : "Search millions of tracks..."}
              aria-label="Search tracks"
              className="flex-1 bg-transparent font-display font-semibold text-[16px] focus:outline-none min-w-0"
            />
            <button onClick={() => setQuery("")} aria-label="Clear search" className="w-10 h-10 rounded-full t-container clay-thumb flex items-center justify-center min-w-[44px]">
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            {(["music", "podcasts"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`h-9 px-4 rounded-full font-display font-bold text-[13px] shrink-0 min-h-[36px] capitalize ${
                    active ? "t-primary clay-button-active" : "t-card clay-card"
                  }`}
                >
                  {m === "music" ? "Music" : "Podcasts"}
                </button>
              );
            })}
          </div>
        </div>

        {mode === "podcasts" ? (
          <>
            {!showingResults ? (
              <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full t-primary-ct clay-thumb flex items-center justify-center mb-2">
                  <Icon name="podcasts" fill className="text-[28px]" />
                </div>
                <h3 className="font-display font-bold text-[22px]">Find a show</h3>
                <p className="text-[14px] t-muted max-w-[280px]">Search above for podcasts. Saved episodes live in Offline.</p>
              </div>
            ) : podSearching ? (
              <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full t-primary-ct animate-bounce" />
                  <span className="w-3.5 h-3.5 rounded-full t-secondary-ct animate-bounce [animation-delay:150ms]" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[var(--tertiary-ct)] animate-bounce [animation-delay:300ms]" />
                </div>
                <p className="text-[13px] font-bold t-muted">Searching the clouds...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[18px]">Shows</span>
                    {!podUnavailable && (
                      <span className="font-display font-bold text-[12px] t-tertiary-ct px-2.5 py-0.5 rounded-full clay-thumb">
                        {podShows.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold t-muted">Tap to preview</span>
                </div>

                {previewError && (
                  <p className="text-[12px] font-bold t-tertiary-text px-1">{previewError}</p>
                )}

                {podUnavailable ? (
                  <p className="text-[12px] font-bold t-muted px-1">
                    Podcasts unavailable right now.
                  </p>
                ) : podShows.length === 0 ? (
                  <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                    <p className="font-display font-bold text-[18px]">No matches</p>
                    <p className="text-[13px] t-muted">Try a different show or topic.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {podShows.map((show) => {
                      const expanded = expandedShow === show.id;
                      const eps = episodes[show.id];
                      const loading = epsLoading === show.id;
                      const showArt = !!show.artwork && !podImgFail.has(show.id);
                      return (
                        <div key={show.id} className="w-full t-card p-3 rounded-2xl clay-card flex flex-col gap-2">
                          <button onClick={() => handleToggleShow(show)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                            {showArt ? (
                              <img
                                src={show.artwork as string}
                                alt=""
                                width={56}
                                height={56}
                                onError={() => setPodImgFail((prev) => new Set(prev).add(show.id))}
                                className="w-14 h-14 rounded-2xl object-cover clay-thumb shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: "#D6F0FF" }}>
                                <Icon name="podcasts" className="text-[28px]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-display font-bold text-[16px] truncate">{show.title}</p>
                              <p className="text-[12px] t-muted truncate">
                                {show.artist}{show.genre ? ` • ${show.genre}` : ""}
                              </p>
                            </div>
                            <Icon name={expanded ? "expand_less" : "expand_more"} className="shrink-0" />
                          </button>
                          {expanded && (
                            <div className="flex flex-col gap-2 pt-1">
                              {loading ? (
                                <p className="text-[12px] font-bold t-muted px-1">Loading episodes...</p>
                              ) : !eps || eps.length === 0 ? (
                                <p className="text-[12px] font-bold t-muted px-1">No episodes found.</p>
                              ) : (
                                eps.map((ep) => {
                                  const key = `pod-${ep.id}`;
                                  const isSaved = savedIds.has(key);
                                  const prog = dlProg[key];
                                  const isDownloading = prog !== undefined;
                                  const isCurrent = current?.id === key && playing;
                                  const isPreviewing = previewingId === key;
                                  return (
                                    <div
                                      key={ep.id}
                                      onClick={() => handlePreviewPod(show, ep)}
                                      className="w-full t-container p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left cursor-pointer"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="font-display font-bold text-[14px] truncate">{ep.title}</p>
                                        <p className="text-[12px] t-muted truncate">
                                          {isPreviewing
                                            ? "Loading preview..."
                                            : `${shortDate(ep.date)}${shortDate(ep.date) && ep.durationSec ? " • " : ""}${ep.durationSec ? fmtTime(ep.durationSec) : ""}`}
                                        </p>
                                        {ep.description ? (
                                          <p className="text-[11px] t-muted truncate">{ep.description.slice(0, 300)}</p>
                                        ) : null}
                                      </div>
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
                                            handleSavePod(show, ep);
                                          }}
                                          className="w-11 h-11 rounded-full t-tertiary-ct clay-thumb flex items-center justify-center shrink-0"
                                        >
                                          <Icon name={isCurrent ? "pause" : "download"} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            <p className="text-[11px] font-bold t-muted px-1">Saved episodes live in Offline.</p>
          </>
        ) : showingResults ? (
          <>
            {searching ? (
              <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full t-primary-ct animate-bounce" />
                  <span className="w-3.5 h-3.5 rounded-full t-secondary-ct animate-bounce [animation-delay:150ms]" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[var(--tertiary-ct)] animate-bounce [animation-delay:300ms]" />
                </div>
                <p className="text-[13px] font-bold t-muted">Searching the clouds...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[18px]">Originals</span>
                    {!saavnUnavailable && (
                      <span className="font-display font-bold text-[12px] t-tertiary-ct px-2.5 py-0.5 rounded-full clay-thumb">
                        {rankedSaavnResults.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold t-muted">Tap to preview</span>
                </div>

                {previewError && (
                  <p className="text-[12px] font-bold t-tertiary-text px-1">{previewError}</p>
                )}

                {canonical && spConnected && (
                  <div className="w-full t-card p-3 rounded-2xl clay-card flex items-center gap-3">
                    {canonical.artwork ? (
                      <img
                        src={canonical.artwork}
                        alt=""
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-2xl object-cover clay-thumb shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: "#D6F0FF" }}>
                        <Icon name="music_note" className="text-[28px]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-[16px] truncate">{canonical.title}</p>
                      <p className="text-[12px] t-muted truncate">
                        {canonical.artist}{canonical.album ? ` • ${canonical.album}` : ""}{canonical.durationSec ? ` • ${fmtTime(canonical.durationSec)}` : ""}
                      </p>
                      <p className="text-[11px] font-bold t-muted">Matched from your Spotify</p>
                    </div>
                  </div>
                )}

                {saavnUnavailable ? (
                  <p className="text-[12px] font-bold t-muted px-1">
                    Originals unavailable right now.
                  </p>
                ) : rankedSaavnResults.length === 0 ? (
                  <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                    <p className="font-display font-bold text-[18px]">No matches</p>
                    <p className="text-[13px] t-muted">Try a different title or artist.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {rankedSaavnResults.map((r, idx) => {
                      const savedKey = `saavn-${r.id}`;
                      const isSaved = savedIds.has(savedKey);
                      const prog = dlProg[savedKey];
                      const isDownloading = prog !== undefined;
                      const imgFailed = saavnImgFail.has(r.id);
                      const isPreviewing = previewingId === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => handlePreviewSaavn(r)}
                          className="w-full t-card p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              {r.artwork && !imgFailed ? (
                                <img
                                  src={r.artwork}
                                  alt=""
                                  width={56}
                                  height={56}
                                  onError={() =>
                                    setSaavnImgFail((prev) => new Set(prev).add(r.id))
                                  }
                                  className="w-14 h-14 rounded-2xl object-cover clay-thumb shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: "#FFE0D6" }}>
                                  <Icon name="music_note" className="text-[28px]" />
                                </div>
                              )}
                              {isPreviewing && (
                                <span
                                  role="status"
                                  aria-label="Loading preview..."
                                  className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center"
                                >
                                  <span className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-display font-bold text-[16px] truncate">{r.title}</p>
                              {showMatchBadge && idx === 0 && (
                                <span className="inline-block font-display font-bold text-[11px] t-primary-ct px-2.5 py-0.5 rounded-full clay-thumb mt-1">
                                  Official match
                                </span>
                              )}
                              <p className="text-[12px] t-muted truncate">
                                {isPreviewing
                                  ? "Loading preview..."
                                  : `${r.artist} • ${fmtTime(r.durationSec)}`}
                              </p>
                            </div>
                          </div>
                          {isSaved ? (
                            <span aria-label="Saved" className="w-11 h-11 rounded-full bg-[#c7f5dc] clay-thumb flex items-center justify-center shrink-0 text-[#144d32]">
                              <Icon name="check" />
                            </span>
                          ) : isDownloading ? (
                            <span className="relative w-11 h-11 rounded-full t-container clay-thumb flex items-center justify-center shrink-0">
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
                              aria-label={`Download ${r.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveSaavn(r);
                              }}
                              className="w-11 h-11 rounded-full t-tertiary-ct clay-thumb flex items-center justify-center shrink-0"
                            >
                              <Icon name="download" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[18px]">Your stash</span>
                <span className="font-display font-bold text-[12px] t-variant px-2.5 py-0.5 rounded-full clay-thumb">{saved.length} saved</span>
              </div>
              <span className="text-[11px] font-bold t-muted">Tap to play</span>
            </div>

            {saved.length === 0 ? (
              <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full t-primary-ct clay-thumb flex items-center justify-center mb-2">
                  <Icon name="cloud" fill className="text-[28px]" />
                </div>
                <h3 className="font-display font-bold text-[22px]">Nothing here yet</h3>
                <p className="text-[14px] t-muted max-w-[280px]">Import audio files and they will appear here, offline forever.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {saved.map((t) => {
                  const isCurrent = current?.id === t.id && playing;
                  return (
                    <button key={t.id} onClick={() => play(t.id)} className="w-full t-card p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-14 h-14 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: t.bg }}>
                          <Icon name={t.icon} className="text-[28px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-bold text-[16px] truncate">{t.title}</p>
                          <p className="text-[12px] t-muted truncate">{t.artist} • {fmtTime(t.durationSec)}</p>
                        </div>
                      </div>
                      <span className="w-11 h-11 rounded-full t-primary-ct clay-thumb flex items-center justify-center shrink-0">
                        <Icon name={isCurrent ? "pause" : "play_arrow"} fill />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <MiniPlayer />
      <BottomNav active="search" />
    </div>
  );
}
