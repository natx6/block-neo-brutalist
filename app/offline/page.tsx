"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";
import { fmtMB } from "../../lib/catalog";
import { listTracks, removeTrack, stashSize, type SavedTrack } from "../../lib/db";
import { loadSettings, saveFileTracks, saveUrlTrack } from "../../lib/downloads";
import { usePlayer } from "../../lib/player-context";

const FOUR_GB = 4 * 1024 * 1024 * 1024;

interface ActiveDownload {
  id: string;
  label: string;
  pct: number;
}

export default function OfflinePage() {
  const { current, playing, offlineMode, setOfflineMode, play } = usePlayer();
  const [tracks, setTracks] = useState<SavedTrack[]>([]);
  const [size, setSize] = useState(0);
  const [quota, setQuota] = useState(0);
  const [usage, setUsage] = useState(0);
  const [active] = useState<ActiveDownload[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [url, setUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [dlPct, setDlPct] = useState(0);
  const [urlError, setUrlError] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "music" | "podcasts">("all");
  const [artFail, setArtFail] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, bytes] = await Promise.all([listTracks(), stashSize()]);
      setTracks(list);
      setSize(bytes);
    } catch {}
    try {
      if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        setQuota(est.quota || 0);
        setUsage(est.usage || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pct = quota
    ? Math.round((usage / quota) * 100)
    : Math.min(99, Math.round((size / FOUR_GB) * 100));

  const handleDelete = async (id: string) => {
    await removeTrack(id).catch(() => {});
    await refresh();
  };

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

  return (
    <div className="t-bg h-dvh max-w-[430px] mx-auto flex flex-col relative overflow-hidden">
      <TopBar title="Offline" />
      <main className="flex-1 min-h-0 pt-[calc(4rem+env(safe-area-inset-top))] pb-[144px] px-5 flex flex-col gap-4 overflow-y-auto overscroll-contain">
        <div className="pt-3" />

        <div className="w-full t-surface rounded-2xl p-4 clay-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-[14px] flex items-center gap-1.5">
              <Icon name="pie_chart" className="text-[18px]" /> Puff Stash
            </span>
            <span className="font-display font-bold text-[12px] t-primary-text">{pct}% Filled</span>
          </div>
          <div className="w-full h-7 rounded-full t-variant p-1 shadow-[inset_2px_2px_5px_rgba(74,59,92,0.18)]">
            <div className="h-full rounded-full t-secondary-ct clay-thumb" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="flex justify-between text-[12px] font-medium">
            <span>{fmtMB(size)} saved • {tracks.length} songs</span>
            <button onClick={refresh} className="px-3 py-1.5 rounded-full t-card clay-card font-display font-bold text-[12px]">Refresh</button>
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
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.opus,.weba"
            multiple
            tabIndex={-1}
            aria-hidden
            className="absolute w-px h-px opacity-0 overflow-hidden pointer-events-none"
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
          {urlError && <p className="text-[12px] font-bold t-tertiary-text">{urlError}</p>}
          <p className="text-[11px] font-medium t-muted">
            Tip: use DRM-free audio from the Files app — Apple Music streams cannot be imported.
          </p>
        </div>

        <div className="w-full t-container rounded-2xl p-4 clay-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full t-variant clay-thumb flex items-center justify-center">
              <Icon name="airplanemode_active" className="text-[22px]" />
            </div>
            <div>
              <p className="font-display font-bold">Offline Mode</p>
              <p className="text-[12px]">Only play downloaded tunes</p>
            </div>
          </div>
          <button onClick={() => setOfflineMode(!offlineMode)} role="switch" aria-checked={offlineMode} className={`w-16 h-9 rounded-full p-1 min-w-[64px] ${offlineMode ? "t-secondary-ct" : "t-variant"}`}>
            <div className={`w-7 h-7 rounded-full bg-white clay-thumb transition-transform ${offlineMode ? "translate-x-7" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="w-full t-surface rounded-2xl p-4 clay-card flex flex-col gap-3">
          <p className="font-display font-bold">Download Queue</p>
          {active.length === 0 ? (
            <p className="text-[13px] t-muted">Queue clear — nothing downloading.</p>
          ) : (
            active.map((d) => (
              <div key={d.id} className="t-card rounded-2xl p-3 clay-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display font-bold text-[12px] truncate">{d.label}</p>
                  <span className="font-bold text-[12px]">{d.pct}%</span>
                </div>
                <div className="w-full h-3 rounded-full t-variant p-0.5">
                  <div className="h-full rounded-full bg-[var(--secondary-ct)]" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="font-display font-bold text-[22px]">Downloaded Tunes <span className="text-[12px] t-variant rounded-full px-2 py-0.5">{tracks.length}</span></p>
        </div>

        <div className="flex gap-2">
          {(["all", "music", "podcasts"] as const).map((k) => {
            const active = kindFilter === k;
            return (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={`h-9 px-4 rounded-full font-display font-bold text-[13px] shrink-0 min-h-[36px] capitalize ${
                  active ? "t-primary clay-button-active" : "t-card clay-card"
                }`}
              >
                {k === "all" ? "All" : k === "music" ? "Music" : "Podcasts"}
              </button>
            );
          })}
        </div>

        {tracks.length === 0 ? (
          <div className="w-full py-8 flex flex-col items-center text-center">
            <p className="font-display font-bold text-[16px]">No tunes yet — add from Search.</p>
            <Link href="/search" className="mt-3 h-11 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center min-h-[44px]">
              Go to Search
            </Link>
          </div>
        ) : (
          tracks
            .filter((s) =>
              kindFilter === "all" ? true : kindFilter === "podcasts" ? s.kind === "podcast" : s.kind !== "podcast"
            )
            .map((s) => {
            const isCurrent = current?.id === s.id && playing;
            const isPod = s.kind === "podcast";
            const showArt = !!s.artwork && !artFail.has(s.id);
            return (
              <div key={s.id} className="w-full t-card rounded-2xl p-3 clay-card flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {showArt ? (
                    <img
                      src={s.artwork as string}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover shrink-0"
                      onError={() => setArtFail((prev) => new Set(prev).add(s.id))}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl t-container flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                      <Icon name={s.icon} className="text-[24px]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-display font-bold truncate">{s.title}</p>
                    {isPod && s.podcast ? (
                      <p className="text-[12px] t-tertiary-text truncate">{s.podcast}</p>
                    ) : (
                      <p className="text-[12px] t-tertiary-text truncate">{s.artist}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => play(s.id)} aria-label={`Play ${s.title}`} className="w-10 h-10 rounded-full t-primary-ct clay-card flex items-center justify-center min-w-[44px]">
                    <Icon name={isCurrent ? "pause" : "play_arrow"} fill className="text-[20px]" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} aria-label={`Delete ${s.title}`} className="w-10 h-10 rounded-full t-tertiary-ct clay-card flex items-center justify-center min-w-[44px]">
                    <Icon name="delete" className="text-[20px]" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="w-full t-variant-40 rounded-2xl p-4 clay-card flex gap-3 items-start">
          <Icon name="lightbulb" className="text-[20px]" />
          <p className="text-[12px]">Tip: everything here plays in airplane mode.</p>
        </div>
      </main>
      <MiniPlayer />
      <BottomNav active="offline" />
    </div>
  );
}
