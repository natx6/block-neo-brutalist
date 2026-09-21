"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "../components/Nav";
import { usePlayer } from "../../lib/player-context";
import { fmtTime } from "../../lib/catalog";
import { db, listPlaylists, type Playlist } from "../../lib/db";
import { isSaved as checkSaved, loadSettings } from "../../lib/downloads";

export default function PlayerPage() {
  const {
    current,
    playing,
    currentTime,
    duration,
    toggle,
    seek,
    next,
    prev,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    saveCurrent,
    resumedFrom,
  } = usePlayer();
  const [liked, setLiked] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const [savePct, setSavePct] = useState<number | null>(null);
  const [savedDone, setSavedDone] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newName, setNewName] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  const title = current?.title ?? "Nothing playing";
  const artist = current?.artist ?? "Import tunes to begin";
  const pct = duration ? (currentTime / duration) * 100 : 0;

  const isStash = current?.source === "stash";
  const isSaved = isStash || savedDone;
  const sourceLabel = !current ? "No source" : isStash ? "Saved offline" : "Preview";

  useEffect(() => {
    setArtFailed(false);
  }, [current?.artwork]);

  useEffect(() => {
    let live = true;
    const check = async () => {
      if (!current) {
        if (live) setSavedDone(false);
        return;
      }
      if (current.source === "stash") {
        if (live) setSavedDone(true);
        return;
      }
      try {
        if (live) setSavedDone(await checkSaved(current.id));
      } catch {}
    };
    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [current?.id]);

  useEffect(() => {
    setSavePct(null);
  }, [current?.id]);

  useEffect(() => {
    if (!showAdd) return;
    listPlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]));
  }, [showAdd]);

  useEffect(() => {
    if (!addedMsg) return;
    const t = setTimeout(() => setAddedMsg(null), 1600);
    return () => clearTimeout(t);
  }, [addedMsg]);

  useEffect(() => {
    if (!shareMsg) return;
    const t = setTimeout(() => setShareMsg(null), 1600);
    return () => clearTimeout(t);
  }, [shareMsg]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seek(frac * duration);
  };

  const handleSave = async () => {
    if (!current || isSaved || savePct !== null) return;
    try {
      setSavePct(0);
      const quality = loadSettings().quality;
      await saveCurrent(quality, (p) => setSavePct(p));
      setSavedDone(true);
    } catch {
      setSavePct(null);
      return;
    }
    setSavePct(null);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title, text: `${title} by ${artist}`, url };
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share(data);
        return;
      }
      throw new Error("no share");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareMsg("Link copied");
      } catch {
        setShareMsg("Share unavailable");
      }
    }
  };

  const handleCreatePlaylist = async () => {
    const name = newName.trim();
    if (!name) return;
    const rec: Playlist = {
      id: crypto.randomUUID(),
      name,
      trackIds: [],
      createdAt: Date.now(),
    };
    await db.playlists.put(rec);
    setNewName("");
    const next = await listPlaylists().catch(() => [] as Playlist[]);
    setPlaylists(next);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!current || addingId) return;
    try {
      setAddingId(playlistId);
      let trackId = current.id;
      if (current.source !== "stash") {
        trackId = await saveCurrent(loadSettings().quality, () => {});
        setSavedDone(true);
      }
      const pl = await db.playlists.get(playlistId);
      if (!pl) return;
      if (!pl.trackIds.includes(trackId)) {
        await db.playlists.update(playlistId, { trackIds: [...pl.trackIds, trackId] });
      }
      const next = await listPlaylists().catch(() => [] as Playlist[]);
      setPlaylists(next);
      setAddedMsg("Added");
    } catch {
      setAddedMsg("Could not add");
    } finally {
      setAddingId(null);
    }
  };

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => router.back(), 300);
  };

  return (
    <div className={`w-full flex flex-col relative overflow-hidden h-dvh transition-transform duration-300 ease-in ${leaving ? "translate-y-full" : ""}`} style={{ background: "linear-gradient(180deg, var(--bg) 0%, var(--container) 55%, var(--bg) 100%)" }}>
      {/* Edge-to-edge animated backdrop — drifts while playing, still when paused */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-[8%] -left-[20%] w-[90%] aspect-square rounded-full blur-3xl puff-blob-a"
          style={{ background: current?.bg ?? "var(--primary-ct)", opacity: 0.6, animationPlayState: playing ? "running" : "paused" }}
        />
        <div
          className="absolute top-[30%] -right-[20%] w-[85%] aspect-square rounded-full blur-3xl puff-blob-b"
          style={{ background: "var(--tertiary-ct)", opacity: 0.55, animationPlayState: playing ? "running" : "paused" }}
        />
        <div
          className="absolute -bottom-[10%] -left-[10%] w-[70%] aspect-square rounded-full blur-3xl puff-blob-a"
          style={{ background: "var(--secondary-ct)", opacity: 0.45, animationPlayState: playing ? "running" : "paused", animationDelay: "-7s" }}
        />
      </div>
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-transparent">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <button onClick={dismiss} aria-label="Collapse player" className="w-11 h-11 rounded-full t-container clay-card flex items-center justify-center min-w-[44px]">
              <Icon name="expand_more" />
            </button>
            <h1 className="font-display font-bold text-[18px]">Now Playing</h1>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[430px] mx-auto flex-1 min-h-0 pt-[calc(4rem+env(safe-area-inset-top))] pb-3 px-5 flex flex-col overflow-hidden relative z-10">

        {!current ? (
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-[min(84vw,340px,38dvh)] aspect-square rounded-[18px] overflow-hidden flex items-center justify-center shrink-0 t-primary-ct">
              <Icon name="cloud" className="text-[72px]" fill />
            </div>
            <h2 className="font-display font-bold text-[22px] mt-6">Nothing playing</h2>
            <p className="font-bold text-[14px] t-muted">Import tunes to begin</p>
            <p className="text-[13px] t-muted mt-2">Pick something from your stash</p>
            <Link href="/offline" className="mt-4 h-12 px-6 rounded-full t-primary font-display font-bold clay-button-active flex items-center min-h-[48px]">
              Open my stash
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-center pt-1 pb-2 shrink-0">
              <div className="relative w-[min(84vw,340px,38dvh)] aspect-square rounded-[18px] overflow-hidden flex items-center justify-center" style={{ background: current.bg }}>
                {current.artwork && !artFailed ? (
                  <img
                    src={current.artwork}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={() => setArtFailed(true)}
                  />
                ) : (
                  <>
                    <Icon name={current.icon} className="text-[72px]" fill />
                    <Icon name="music_note" className="text-[64px]" />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-1 mb-2 shrink-0">
              <div className="min-w-0 pr-4">
                <h2 className="font-display font-bold text-[22px] truncate">{title}</h2>
                <p className="font-bold text-[14px] t-muted truncate">{artist}</p>
              </div>
              <button onClick={() => setLiked(!liked)} aria-label="Favorite" className="w-12 h-12 rounded-full t-card clay-card flex items-center justify-center min-w-[48px] min-h-[48px]">
                <Icon name="favorite" fill={liked} className="text-[28px]" />
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-3 shrink-0">
              <div className="relative w-full h-8 flex items-center cursor-pointer" onClick={handleSeek}>
                <div className="w-full h-3 rounded-full t-variant shadow-[inset_2px_2px_4px_rgba(74,59,92,0.14)] p-[2px]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--secondary-ct)] via-[var(--primary-ct)] to-[var(--primary)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="absolute w-6 h-6 rounded-full t-card clay-thumb flex items-center justify-center" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                </div>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="font-display font-bold text-[11px]">{fmtTime(currentTime)}</span>
                <span className="px-2 py-0.5 rounded-full t-container text-[11px] font-bold">{sourceLabel}</span>
                {resumedFrom !== null && resumedFrom > 0 && (
                  <span className="px-2 py-0.5 rounded-full t-secondary-ct text-[11px] font-bold">
                    Resumed {fmtTime(resumedFrom)}
                  </span>
                )}
                <span className="font-display font-bold text-[11px]">{fmtTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 mb-8 shrink-0">
              <button
                onClick={toggleShuffle}
                aria-label="Shuffle"
                title={shuffle ? "Shuffle on" : "Shuffle off"}
                className={`w-11 h-11 rounded-full clay-card flex items-center justify-center min-w-[44px] min-h-[44px] ${shuffle ? "t-primary-ct" : "t-container"}`}
              >
                <Icon name="shuffle" />
              </button>
              <button onClick={prev} aria-label="Previous" className="w-[52px] h-[52px] rounded-full t-variant clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
                <Icon name="skip_previous" fill />
              </button>
              <button onClick={toggle} aria-label="Play or pause" className="w-[72px] h-[72px] rounded-full t-tertiary-ct clay-card flex items-center justify-center min-w-[72px] min-h-[72px] active:scale-95">
                <Icon name={playing ? "pause" : "play_arrow"} fill className="text-[36px]" />
              </button>
              <button onClick={next} aria-label="Next" className="w-[52px] h-[52px] rounded-full t-secondary-ct clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
                <Icon name="skip_next" fill />
              </button>
              <button
                onClick={cycleRepeat}
                aria-label="Repeat"
                title={`Repeat ${repeatMode}`}
                className={`w-11 h-11 rounded-full clay-card flex items-center justify-center min-w-[44px] min-h-[44px] ${repeatMode !== "off" ? "t-primary-ct" : "t-container"}`}
              >
                <Icon name={repeatMode === "one" ? "repeat_one" : "repeat"} />
              </button>
            </div>
          </>
        )}

        <div className="w-full px-1 py-2 flex items-center justify-around shrink-0">
          <button
            onClick={handleSave}
            disabled={!current || isSaved || savePct !== null}
            aria-label="Save track"
            className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center disabled:opacity-60"
          >
            <div className="w-11 h-11 rounded-full t-card clay-thumb flex items-center justify-center">
              <Icon name={isSaved ? "check" : "download"} className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">{savePct !== null ? `${savePct}%` : "Saved"}</span>
          </button>
          <button onClick={() => setShowAdd(true)} aria-label="Add to playlist" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full t-card clay-thumb flex items-center justify-center">
              <Icon name="add" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">Add</span>
          </button>
          <button onClick={handleShare} aria-label="Share track" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full t-card clay-thumb flex items-center justify-center">
              <Icon name="share" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">{shareMsg ?? "Share"}</span>
          </button>
          <Link href="/queue" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full t-card clay-thumb flex items-center justify-center">
              <Icon name="queue_music" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">Queue</span>
          </Link>
        </div>
      </main>

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30">
          <div className="w-full max-w-[430px] t-card rounded-t-[28px] p-5 clay-card max-h-[70dvh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-[16px]">Add to playlist</h3>
              <button onClick={() => setShowAdd(false)} aria-label="Close" className="w-10 h-10 rounded-full t-container clay-card flex items-center justify-center min-w-[40px] min-h-[40px]">
                <Icon name="close" />
              </button>
            </div>
            {!current ? (
              <p className="text-[13px] t-muted font-bold">Nothing playing to add.</p>
            ) : (
              <p className="text-[12px] t-muted font-bold truncate mb-3">{title} - {artist}</p>
            )}
            <div className="flex gap-2 mb-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New playlist name"
                className="flex-1 h-12 px-4 rounded-full t-container font-bold text-[13px] outline-none min-h-[48px]"
              />
              <button onClick={handleCreatePlaylist} className="h-12 px-5 rounded-full t-primary font-display font-bold clay-button-active min-h-[48px]">
                New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {playlists.length === 0 && (
                <p className="text-[13px] t-muted">No playlists yet. Create one above.</p>
              )}
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddToPlaylist(p.id)}
                  disabled={!current || addingId !== null}
                  className="w-full h-14 px-4 rounded-2xl t-container clay-card flex items-center justify-between min-h-[56px] disabled:opacity-60"
                >
                  <span className="font-display font-bold text-[14px] truncate">{p.name}</span>
                  <span className="text-[11px] font-bold t-muted">{addingId === p.id ? "Adding" : `${p.trackIds.length} tracks`}</span>
                </button>
              ))}
            </div>
            {addedMsg && (
              <p className="text-center mt-3 font-display font-bold text-[13px] t-primary-text">{addedMsg}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
