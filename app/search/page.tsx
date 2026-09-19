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
} from "../../lib/downloads";
import { audiusStreamUrl, searchAudius, type OnlineResult } from "../../lib/audius";
import { usePlayer } from "../../lib/player-context";

export default function SearchPage() {
  const { current, playing, play, preview } = usePlayer();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [saved, setSaved] = useState<SavedTrack[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState<OnlineResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [dlProg, setDlProg] = useState<Record<string, number>>({});
  const [url, setUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [dlPct, setDlPct] = useState(0);
  const [urlError, setUrlError] = useState("");
  const [importStatus, setImportStatus] = useState("");
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
      setSearching(false);
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    searchAudius(debounced, 15)
      .then((res) => {
        if (!cancelled) setOnline(res);
      })
      .catch(() => {
        if (!cancelled) {
          setOnline([]);
          setSearchError("Search failed — check connection.");
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
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

  const showingOnline = debounced.length > 0;

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <TopBar title="Search" />
      <main className="flex-1 pt-16 pb-[180px] px-5 flex flex-col gap-4">
        <div className="pt-3">
          <div className="flex items-center w-full h-14 bg-white rounded-full px-4 clay-card">
            <span className="text-[#64568a] mr-2 flex items-center">
              <Icon name="search" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search millions of tracks..."
              aria-label="Search tracks"
              className="flex-1 bg-transparent font-display font-semibold text-[16px] focus:outline-none min-w-0"
            />
            <button onClick={() => setQuery("")} aria-label="Clear search" className="w-10 h-10 rounded-full bg-[#f6e9ff] clay-thumb flex items-center justify-center min-w-[44px]">
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>

        <div className="w-full bg-white p-4 rounded-2xl clay-card flex flex-col gap-3">
          <p className="font-display font-bold text-[16px]">Add music</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-12 rounded-full bg-[#64568a] text-white font-display font-bold text-[14px] clay-button-active flex items-center justify-center gap-1.5 min-h-[48px]"
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
            <p className="text-[12px] font-bold text-[#49454e]">{importStatus}</p>
          )}
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste an audio link..."
              aria-label="Audio link"
              className="flex-1 h-12 rounded-full bg-[#fbf0ff] px-4 text-[14px] font-medium focus:outline-none min-w-0 shadow-[inset_2px_2px_5px_rgba(74,59,92,0.12)]"
            />
            <button
              onClick={handleUrl}
              disabled={downloading || !url.trim()}
              className="h-12 px-5 rounded-full bg-[#a6d7fe] font-display font-bold text-[14px] clay-thumb min-h-[48px] shrink-0 disabled:opacity-50 flex items-center gap-1.5"
            >
              {downloading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full border-2 border-[#306385] border-t-transparent animate-spin" />
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
              <div className="relative w-11 h-11 rounded-full bg-[#f6e9ff] clay-thumb flex items-center justify-center shrink-0">
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
          {urlError && <p className="text-[12px] font-bold text-[#944652]">{urlError}</p>}
          <p className="text-[11px] font-medium text-[#49454e]">
            Tip: use DRM-free audio from the Files app — Apple Music streams cannot be imported.
          </p>
        </div>

        {showingOnline ? (
          <>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[18px]">Online</span>
                <span className="font-display font-bold text-[12px] bg-[#e9ddff] px-2.5 py-0.5 rounded-full clay-thumb">
                  {online.length}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#49454e]">Tap to preview</span>
            </div>

            {searching ? (
              <div className="w-full bg-white p-6 rounded-2xl clay-card flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#d5c4ff] animate-bounce" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[#a6d7fe] animate-bounce [animation-delay:150ms]" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[#ffc7d1] animate-bounce [animation-delay:300ms]" />
                </div>
                <p className="text-[13px] font-bold text-[#49454e]">Searching the clouds...</p>
              </div>
            ) : searchError ? (
              <div className="w-full bg-white p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                <p className="text-[13px] font-bold text-[#944652]">{searchError}</p>
              </div>
            ) : online.length === 0 ? (
              <div className="w-full bg-white p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                <p className="font-display font-bold text-[18px]">No matches</p>
                <p className="text-[13px] text-[#49454e]">Try a different title or artist.</p>
              </div>
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
                        preview(
                          {
                            id: savedKey,
                            title: r.title,
                            artist: r.artist,
                            durationSec: r.durationSec,
                            icon: "music_note",
                            bg: "#E9DCFF",
                            artwork: r.artwork,
                          },
                          audiusStreamUrl(r.sourceId)
                        )
                      }
                      className="w-full bg-white p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left cursor-pointer"
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
                          <p className="text-[12px] text-[#49454e] truncate">
                            {r.artist} • {fmtTime(r.durationSec)}
                          </p>
                        </div>
                      </div>
                      {isSaved ? (
                        <span aria-label="Saved" className="w-11 h-11 rounded-full bg-[#c7f5dc] clay-thumb flex items-center justify-center shrink-0 text-[#144d32]">
                          <Icon name="check" />
                        </span>
                      ) : isDownloading ? (
                        <span className="relative w-11 h-11 rounded-full bg-[#f6e9ff] clay-thumb flex items-center justify-center shrink-0">
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
                          className="w-11 h-11 rounded-full bg-[#d5c4ff] clay-thumb flex items-center justify-center shrink-0 text-[#231534]"
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
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[18px]">Your stash</span>
                <span className="font-display font-bold text-[12px] bg-[#e9ddff] px-2.5 py-0.5 rounded-full clay-thumb">{saved.length} saved</span>
              </div>
              <span className="text-[11px] font-bold text-[#49454e]">Tap to play</span>
            </div>

            {saved.length === 0 ? (
              <div className="w-full bg-white p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-[#d5c4ff] clay-thumb flex items-center justify-center text-[#4c3f70] mb-2">
                  <Icon name="cloud" fill className="text-[28px]" />
                </div>
                <h3 className="font-display font-bold text-[22px]">Nothing here yet</h3>
                <p className="text-[14px] text-[#49454e] max-w-[280px]">Import audio files and they will appear here, offline forever.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {saved.map((t) => {
                  const isCurrent = current?.id === t.id && playing;
                  return (
                    <button key={t.id} onClick={() => play(t.id)} className="w-full bg-white p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-14 h-14 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: t.bg }}>
                          <Icon name={t.icon} className="text-[28px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-bold text-[16px] truncate">{t.title}</p>
                          <p className="text-[12px] text-[#49454e] truncate">{t.artist} • {fmtTime(t.durationSec)}</p>
                        </div>
                      </div>
                      <span className="w-11 h-11 rounded-full bg-[#d5c4ff] clay-thumb flex items-center justify-center shrink-0 text-[#231534]">
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
