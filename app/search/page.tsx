"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";
import { fmtTime } from "../../lib/catalog";
import { listTracks, type SavedTrack } from "../../lib/db";
import {
  loadSettings,
  saveAudiusTrack,
  saveFileTracks,
  saveUrlTrack,
  saveYouTubeTrack,
} from "../../lib/downloads";
import { audiusStreamUrl, searchAudius, type OnlineResult } from "../../lib/audius";
import {
  searchYouTube,
  ytPreviewUrl,
  type YTResult,
} from "../../lib/youtube";
import { usePlayer } from "../../lib/player-context";

function ytMeta(r: YTResult) {
  return {
    id: `yt-${r.videoId}`,
    title: r.title,
    artist: r.artist,
    durationSec: r.durationSec,
    icon: "music_note",
    bg: "#FFE0D6",
    artwork: r.artwork,
    source: "youtube" as const,
    sourceId: r.videoId,
  };
}

function audiusMeta(r: OnlineResult) {
  return {
    id: `audius-${r.sourceId}`,
    title: r.title,
    artist: r.artist,
    durationSec: r.durationSec,
    icon: "music_note",
    bg: "#E9DCFF",
    artwork: r.artwork,
    source: "audius" as const,
    sourceId: r.sourceId,
  };
}

export default function SearchPage() {
  const { current, playing, play, preview } = usePlayer();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [saved, setSaved] = useState<SavedTrack[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState<OnlineResult[]>([]);
  const [ytResults, setYtResults] = useState<YTResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [ytUnavailable, setYtUnavailable] = useState(false);
  const [ytImgFail, setYtImgFail] = useState<Set<string>>(new Set());
  const [dlProg, setDlProg] = useState<Record<string, number>>({});
  const [url, setUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [dlPct, setDlPct] = useState(0);
  const [urlError, setUrlError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const tracks = await listTracks();
      setSaved(tracks);
      setSavedIds(new Set(tracks.map((t) => t.id)));
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 600);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!debounced) {
      setOnline([]);
      setYtResults([]);
      setSearching(false);
      setSearchError("");
      setYtUnavailable(false);
      return;
    }
    setSearching(true);
    setSearchError("");
    setYtUnavailable(false);
    Promise.allSettled([searchYouTube(debounced, 15), searchAudius(debounced, 15)]).then(
      ([yt, au]) => {
        if (cancelled) return;
        if (yt.status === "fulfilled") {
          setYtResults(yt.value);
          setYtUnavailable(false);
        } else {
          setYtResults([]);
          setYtUnavailable(true);
        }
        if (au.status === "fulfilled") {
          setOnline(au.value);
          setSearchError("");
        } else {
          setOnline([]);
          setSearchError("Search failed — check connection.");
        }
        setSearching(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [debounced]);

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

  const handleUrl = async () => {
    const u = url.trim();
    if (!u || downloading) return;
    setUrlError("");
    setDownloading(true);
    setDlPct(0);
    try {
      await saveUrlTrack(u, loadSettings().quality, (p) => setDlPct(p));
      setUrl("");
      await refresh();
    } catch {
      setUrlError("That link did not return audio.");
    } finally {
      setDownloading(false);
      setDlPct(0);
    }
  };

  const handleSaveAudius = async (r: OnlineResult) => {
    const key = r.sourceId;
    setDlProg((prev) => ({ ...prev, [key]: 0 }));
    try {
      await saveAudiusTrack(r, loadSettings().quality, (p) =>
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

  const handleSaveYouTube = async (r: YTResult) => {
    const key = `yt-${r.videoId}`;
    setDlProg((prev) => ({ ...prev, [key]: 0 }));
    try {
      await saveYouTubeTrack(r, loadSettings().quality, (p) =>
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

  const handlePreviewYouTube = async (r: YTResult) => {
    const key = r.videoId;
    if (previewingId) return;
    setPreviewingId(key);
    try {
      const { url } = await ytPreviewUrl(r.videoId);
      await preview(ytMeta(r), url);
    } catch {
      setYtUnavailable(true);
    } finally {
      setPreviewingId(null);
    }
  };

  const showingOnline = debounced.length > 0;
  const audiusQueue = online.map((r) => ({
    meta: audiusMeta(r),
    url: audiusStreamUrl(r.sourceId),
  }));

  return (
    <div className="t-bg min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <TopBar title="Search" />
      <main className="flex-1 pt-16 pb-[180px] px-5 flex flex-col gap-4">
        <div className="pt-3">
          <div className="flex items-center w-full h-14 t-card rounded-full px-4 clay-card">
            <span className="t-primary-text mr-2 flex items-center">
              <Icon name="search" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search millions of tracks..."
              aria-label="Search tracks"
              className="flex-1 bg-transparent font-display font-semibold text-[16px] focus:outline-none min-w-0"
            />
            <button onClick={() => setQuery("")} aria-label="Clear search" className="w-10 h-10 rounded-full t-container clay-thumb flex items-center justify-center min-w-[44px]">
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>

        <div className="w-full t-card p-4 rounded-2xl clay-card flex flex-col gap-3">
          <p className="font-display font-bold text-[16px]">Add music</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-12 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center justify-center gap-1.5 min-h-[48px]"
          >
            <Icon name="upload" className="text-[20px]" />
            Import from device
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {importStatus && (
            <p className="text-[12px] font-bold t-muted">{importStatus}</p>
          )}
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste an audio link..."
              aria-label="Audio link"
              className="flex-1 h-12 rounded-full t-surface px-4 text-[14px] font-medium focus:outline-none min-w-0 shadow-[inset_2px_2px_5px_rgba(74,59,92,0.12)]"
            />
            <button
              onClick={handleUrl}
              disabled={downloading || !url.trim()}
              className="h-12 px-5 rounded-full t-secondary-ct font-display font-bold text-[14px] clay-thumb min-h-[48px] shrink-0 disabled:opacity-50 flex items-center gap-1.5"
            >
              {downloading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full border-2 border-[var(--secondary)] border-t-transparent animate-spin" />
                  {dlPct}%
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Icon name="download" className="text-[18px]" />
                  Download
                </span>
              )}
            </button>
          </div>
          {downloading && (
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full t-container clay-thumb flex items-center justify-center shrink-0">
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
                    strokeDashoffset={106.8 * (1 - dlPct / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold">{dlPct}%</span>
              </div>
              <p className="text-[12px] font-bold">Downloading...</p>
            </div>
          )}
          {urlError && <p className="text-[12px] font-bold t-tertiary-text">{urlError}</p>}
          <p className="text-[11px] font-medium t-muted">
            Tip: use DRM-free audio from the Files app — Apple Music streams cannot be imported.
          </p>
        </div>

        {showingOnline ? (
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
                    <span className="font-display font-bold text-[18px]">Top hits</span>
                    {!ytUnavailable && (
                      <span className="font-display font-bold text-[12px] t-tertiary-ct px-2.5 py-0.5 rounded-full clay-thumb">
                        {ytResults.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold t-muted">Tap to preview</span>
                </div>

                {ytUnavailable ? (
                  <p className="text-[12px] font-bold t-muted px-1">
                    YouTube unavailable right now.
                  </p>
                ) : ytResults.length === 0 ? (
                  online.length === 0 && !searchError ? (
                    <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                      <p className="font-display font-bold text-[18px]">No matches</p>
                      <p className="text-[13px] t-muted">Try a different title or artist.</p>
                    </div>
                  ) : (
                    <p className="text-[12px] font-bold t-muted px-1">
                      No Top hits for this query.
                    </p>
                  )
                ) : (
                  <div className="flex flex-col gap-3">
                    {ytResults.map((r) => {
                      const savedKey = `yt-${r.videoId}`;
                      const isSaved = savedIds.has(savedKey);
                      const prog = dlProg[savedKey];
                      const isDownloading = prog !== undefined;
                      const imgFailed = ytImgFail.has(r.videoId);
                      const isPreviewing = previewingId === r.videoId;
                      return (
                        <div
                          key={r.videoId}
                          onClick={() => handlePreviewYouTube(r)}
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
                                    setYtImgFail((prev) => new Set(prev).add(r.videoId))
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
                                handleSaveYouTube(r);
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

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[18px]">Indie</span>
                    <span className="font-display font-bold text-[12px] t-variant px-2.5 py-0.5 rounded-full clay-thumb">
                      {online.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold t-muted">Tap to preview</span>
                </div>

                {searchError ? (
                  <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                    <p className="text-[13px] font-bold t-tertiary-text">{searchError}</p>
                  </div>
                ) : online.length === 0 ? (
                  ytResults.length === 0 && !ytUnavailable ? null : (
                    <p className="text-[12px] font-bold t-muted px-1">
                      No Indie matches for this query.
                    </p>
                  )
                ) : (
                  <div className="flex flex-col gap-3">
                    {online.map((r) => {
                      const savedKey = `audius-${r.sourceId}`;
                      const isSaved = savedIds.has(savedKey);
                      const prog = dlProg[r.sourceId];
                      const isDownloading = prog !== undefined;
                      return (
                        <div
                          key={r.sourceId}
                          onClick={() =>
                            preview(audiusMeta(r), audiusStreamUrl(r.sourceId), audiusQueue)
                          }
                          className="w-full t-card p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {r.artwork ? (
                              <img
                                src={r.artwork}
                                alt=""
                                width={56}
                                height={56}
                                className="w-14 h-14 rounded-2xl object-cover clay-thumb shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: "#E9DCFF" }}>
                                <Icon name="music_note" className="text-[28px]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-display font-bold text-[16px] truncate">{r.title}</p>
                              <p className="text-[12px] t-muted truncate">
                                {r.artist} • {fmtTime(r.durationSec)}
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
                                handleSaveAudius(r);
                              }}
                              className="w-11 h-11 rounded-full t-primary-ct clay-thumb flex items-center justify-center shrink-0"
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
