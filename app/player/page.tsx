"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../components/Nav";
import { usePlayer } from "../../lib/player-context";
import { fmtTime } from "../../lib/catalog";
import { db, listPlaylists, type Playlist } from "../../lib/db";
import { loadSettings } from "../../lib/downloads";

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
  } = usePlayer();
  const [liked, setLiked] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const [savePct, setSavePct] = useState<number | null>(null);
  const [savedDone, setSavedDone] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
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
    setSavedDone(false);
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

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#fff7ff]/80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Back" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px]">‹</Link>
            <h1 className="font-display font-bold text-[18px]">Now Playing</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-10 px-5">
        <div className="absolute -top-16 -left-12 w-64 h-64 rounded-full bg-[#a6d7fe]/40 blur-3xl pointer-events-none" />
        <div className="absolute top-44 -right-16 w-72 h-72 rounded-full bg-[#ffbbc2]/35 blur-3xl pointer-events-none" />

        {!current ? (
          <div className="flex flex-col items-center text-center pt-10">
            <div className="w-[280px] h-[280px] rounded-[32px] p-4 bg-white clay-card flex items-center justify-center">
              <div className="w-full h-full rounded-[22px] bg-[#E9DCFF] flex items-center justify-center text-[#4c3f70]">
                <Icon name="cloud" className="text-[72px]" fill />
              </div>
            </div>
            <h2 className="font-display font-bold text-[22px] mt-6">Nothing playing</h2>
            <p className="font-bold text-[14px] text-[#49454e]">Import tunes to begin</p>
            <p className="text-[13px] text-[#49454e] mt-2">Pick something from your stash</p>
            <Link href="/offline" className="mt-4 h-12 px-6 rounded-full bg-[#64568a] text-white font-display font-bold clay-button-active flex items-center min-h-[48px]">
              Open my stash
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-center pt-2 pb-6">
              <div className="relative w-[280px] h-[280px] rounded-[32px] p-4 bg-white clay-card flex items-center justify-center">
                <div className="absolute top-6 left-8 right-8 h-8 rounded-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none z-10" />
                <div className="w-full h-full rounded-[22px] overflow-hidden flex items-center justify-center gap-2 text-[#4c3f70]" style={{ background: current.bg }}>
                  {current.artwork && !artFailed ? (
                    <img
                      src={current.artwork}
                      alt={title}
                      className="w-full h-full rounded-[22px] object-cover"
                      onError={() => setArtFailed(true)}
                    />
                  ) : (
                    <>
                      <Icon name={current.icon} className="text-[72px]" fill />
                      <Icon name="music_note" className="text-[64px]" />
                    </>
                  )}
                </div>
                <div className="absolute -bottom-3 right-5 px-3 py-1 rounded-full bg-white clay-thumb flex items-center gap-1.5 z-20">
                  <span className="w-2 h-2 rounded-full bg-[#306385] animate-pulse" />
                  <span className="font-display font-bold text-[11px] tracking-wider uppercase">Lo-Fi Master</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 mb-6">
              <div className="min-w-0 pr-4">
                <h2 className="font-display font-bold text-[22px] truncate">{title}</h2>
                <p className="font-bold text-[14px] text-[#49454e] truncate">{artist}</p>
              </div>
              <button onClick={() => setLiked(!liked)} aria-label="Favorite" className="w-12 h-12 rounded-full bg-white clay-card flex items-center justify-center min-w-[48px] min-h-[48px]">
                <Icon name="favorite" fill={liked} className="text-[28px]" />
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-8">
              <div className="relative w-full h-8 flex items-center cursor-pointer" onClick={handleSeek}>
                <div className="w-full h-3 rounded-full bg-[#f2e2ff] shadow-[inset_2px_2px_4px_rgba(74,59,92,0.14)] p-[2px]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#a6d7fe] via-[#d5c4ff] to-[#64568a]" style={{ width: `${pct}%` }} />
                </div>
                <div className="absolute w-6 h-6 rounded-full bg-white clay-thumb flex items-center justify-center" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#64568a]" />
                </div>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="font-display font-bold text-[11px]">{fmtTime(currentTime)}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#f6e9ff] text-[11px] font-bold">{sourceLabel}</span>
                <span className="font-display font-bold text-[11px]">{fmtTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 mb-8">
              <button
                onClick={toggleShuffle}
                aria-label="Shuffle"
                title={shuffle ? "Shuffle on" : "Shuffle off"}
                className={`w-11 h-11 rounded-full clay-card flex items-center justify-center min-w-[44px] min-h-[44px] ${shuffle ? "bg-[#d5c4ff]" : "bg-[#f6e9ff]"}`}
              >
                <Icon name="shuffle" />
              </button>
              <button onClick={prev} aria-label="Previous" className="w-[52px] h-[52px] rounded-full bg-[#e9ddff] clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
                <Icon name="skip_previous" fill />
              </button>
              <button onClick={toggle} aria-label="Play or pause" className="w-[72px] h-[72px] rounded-full bg-[#ffbbc2] clay-card flex items-center justify-center min-w-[72px] min-h-[72px] active:scale-95">
                <Icon name={playing ? "pause" : "play_arrow"} fill className="text-[36px]" />
              </button>
              <button onClick={next} aria-label="Next" className="w-[52px] h-[52px] rounded-full bg-[#c9e6ff] clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
                <Icon name="skip_next" fill />
              </button>
              <button
                onClick={cycleRepeat}
                aria-label="Repeat"
                title={`Repeat ${repeatMode}`}
                className={`w-11 h-11 rounded-full clay-card flex items-center justify-center min-w-[44px] min-h-[44px] ${repeatMode !== "off" ? "bg-[#d5c4ff]" : "bg-[#f6e9ff]"}`}
              >
                <Icon name={repeatMode === "one" ? "repeat_one" : "repeat"} />
              </button>
            </div>
          </>
        )}

        <div className="w-full bg-[#f6e9ff]/60 rounded-[28px] p-3 clay-card flex items-center justify-around">
          <button
            onClick={handleSave}
            disabled={!current || isSaved || savePct !== null}
            aria-label="Save track"
            className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center disabled:opacity-60"
          >
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name={isSaved ? "check" : "download"} className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">{savePct !== null ? `${savePct}%` : "Saved"}</span>
          </button>
          <button onClick={() => setShowAdd(true)} aria-label="Add to playlist" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name="add" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">Add</span>
          </button>
          <button onClick={handleShare} aria-label="Share track" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name="share" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">{shareMsg ?? "Share"}</span>
          </button>
          <Link href="/queue" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name="queue_music" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">Queue</span>
          </Link>
        </div>

        <Link href="/" className="block text-center mt-6 font-display font-bold text-[12px] text-[#64568a]">Back Home</Link>
      </main>

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30">
          <div className="w-full max-w-[430px] bg-white rounded-t-[28px] p-5 clay-card max-h-[70dvh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-[16px]">Add to playlist</h3>
              <button onClick={() => setShowAdd(false)} aria-label="Close" className="w-10 h-10 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[40px] min-h-[40px]">
                <Icon name="close" />
              </button>
            </div>
            {!current ? (
              <p className="text-[13px] text-[#49454e] font-bold">Nothing playing to add.</p>
            ) : (
              <p className="text-[12px] text-[#49454e] font-bold truncate mb-3">{title} - {artist}</p>
            )}
            <div className="flex gap-2 mb-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New playlist name"
                className="flex-1 h-12 px-4 rounded-full bg-[#f6e9ff] font-bold text-[13px] outline-none min-h-[48px]"
              />
              <button onClick={handleCreatePlaylist} className="h-12 px-5 rounded-full bg-[#64568a] text-white font-display font-bold clay-button-active min-h-[48px]">
                New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {playlists.length === 0 && (
                <p className="text-[13px] text-[#49454e]">No playlists yet. Create one above.</p>
              )}
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddToPlaylist(p.id)}
                  disabled={!current || addingId !== null}
                  className="w-full h-14 px-4 rounded-2xl bg-[#f6e9ff] clay-card flex items-center justify-between min-h-[56px] disabled:opacity-60"
                >
                  <span className="font-display font-bold text-[14px] truncate">{p.name}</span>
                  <span className="text-[11px] font-bold text-[#49454e]">{addingId === p.id ? "Adding" : `${p.trackIds.length} tracks`}</span>
                </button>
              ))}
            </div>
            {addedMsg && (
              <p className="text-center mt-3 font-display font-bold text-[13px] text-[#64568a]">{addedMsg}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
