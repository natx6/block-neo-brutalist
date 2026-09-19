"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "../components/Nav";
import { fmtTime } from "../../lib/catalog";
import { db, getTrack, listTracks, type Playlist, type SavedTrack } from "../../lib/db";
import { usePlayer } from "../../lib/player-context";

function PlaylistInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const { current, playing, play, playList } = usePlayer();
  const [saveAll, setSaveAll] = useState(true);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<SavedTrack[]>([]);

  const refresh = useCallback(async () => {
    if (!id) {
      try {
        setTracks(await listTracks());
      } catch {}
      setPlaylist(null);
      return;
    }
    try {
      const p = await db.playlists.get(id).catch(() => undefined);
      setPlaylist(p ?? null);
      if (!p) {
        setTracks([]);
        return;
      }
      const loaded: SavedTrack[] = [];
      for (const tid of p.trackIds) {
        const t = await getTrack(tid).catch(() => undefined);
        if (t) loaded.push(t);
      }
      setTracks(loaded);
    } catch {}
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const title = playlist ? playlist.name : "My Stash";
  const ids = tracks.map((t) => t.id);

  const handlePlay = () => {
    if (ids.length) playList(ids, 0);
  };

  const handleShuffle = () => {
    if (!ids.length) return;
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playList(shuffled, 0);
  };

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#fff7ff]/80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/library" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px]">‹</Link>
            <h1 className="font-display font-bold">Playlist</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#64568a] flex items-center justify-center text-white">
            <Icon name="person" className="text-[18px]" />
          </div>
        </div>
      </header>
      <main className="flex-1 pt-20 pb-10 px-5 flex flex-col gap-4">
        <div className="rounded-[28px] bg-gradient-to-br from-[#E9DCFF] to-[#D1EEFF] clay-card p-6 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-[24px] bg-white clay-card flex items-center justify-center">
            <Icon name="cloud" className="text-[64px]" fill />
          </div>
          <h2 className="font-display font-bold text-[24px] mt-3">{title}</h2>
          <p className="text-[13px] text-[#49454e]">{tracks.length} tunes</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="font-display font-bold text-[12px]">Save all</span>
            <button onClick={() => setSaveAll(!saveAll)} role="switch" aria-checked={saveAll} className={`w-12 h-7 rounded-full p-0.5 ${saveAll ? "bg-[#d5c4ff]" : "bg-[#eedbff]"}`}>
              <div className={`w-6 h-6 rounded-full bg-white clay-thumb transition-transform ${saveAll ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handlePlay} className="h-14 rounded-full bg-[#64568a] text-white font-display font-bold clay-button-active min-h-[56px] flex items-center justify-center gap-1.5">
            <Icon name="play_arrow" fill /> PLAY
          </button>
          <button onClick={handleShuffle} className="h-14 rounded-full bg-white font-display font-bold clay-card min-h-[56px] flex items-center justify-center gap-1.5">
            <Icon name="shuffle" /> SHUFFLE
          </button>
        </div>
        {tracks.length === 0 ? (
          <div className="w-full bg-white p-6 rounded-2xl clay-card flex flex-col items-center text-center">
            <p className="font-display font-bold text-[16px]">No tracks here yet</p>
            <p className="text-[13px] text-[#49454e] mt-1">Import audio from Search to fill your stash.</p>
            <Link href="/search" className="mt-3 h-11 px-6 rounded-full bg-[#64568a] text-white font-display font-bold text-[14px] clay-button-active flex items-center min-h-[44px]">
              Add music
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tracks.map((s, i) => {
              const isCurrent = current?.id === s.id && playing;
              return (
                <button key={s.id} onClick={() => play(s.id)} className="bg-white rounded-2xl p-3 clay-card flex items-center gap-3 text-left">
                  <span className="font-display font-bold text-[12px] w-5">{String(i + 1).padStart(2, "0")}</span>
                  <div className="w-11 h-11 rounded-2xl bg-[#f6e9ff] flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                    <Icon name={s.icon} className="text-[22px]" />
                  </div>
                  <div className="min-w-0 flex-1"><p className="font-display font-bold text-[14px] truncate">{s.title}</p><p className="text-[12px] truncate">{s.artist}</p></div>
                  <span className="text-[11px] font-bold">{fmtTime(s.durationSec)}</span>
                  <span className="text-[#64568a] flex items-center">
                    <Icon name={isCurrent ? "pause" : "play_arrow"} fill className="text-[20px]" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense>
      <PlaylistInner />
    </Suspense>
  );
}
