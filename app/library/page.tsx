"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";
import { db, listPlaylists, listTracks, type Playlist, type SavedTrack } from "../../lib/db";
import { usePlayer } from "../../lib/player-context";

const TABS = ["Playlists", "Saved"];

let lastTab = 0;

export default function LibraryPage() {
  const { current, playing, play } = usePlayer();
  const [tab, setTabState] = useState(lastTab);
  const setTab = (i: number) => {
    lastTab = i;
    setTabState(i);
  };
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [saved, setSaved] = useState<SavedTrack[]>([]);

  const refresh = useCallback(async () => {
    try {
      setPlaylists(await listPlaylists());
    } catch {}
    try {
      setSaved(await listTracks());
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleNew = async () => {
    const name = typeof window !== "undefined" ? window.prompt("Playlist name") : null;
    if (!name || !name.trim()) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
    try {
      await db.playlists.put({ id, name: name.trim(), trackIds: [], createdAt: Date.now() });
      await refresh();
    } catch {}
  };

  return (
    <div className="t-bg h-dvh max-w-[430px] mx-auto flex flex-col relative overflow-hidden">
      <TopBar title="Library" />
      <main className="flex-1 min-h-0 pt-[calc(4rem+env(safe-area-inset-top))] pb-[150px] px-5 overflow-y-auto overscroll-contain">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`shrink-0 h-11 px-5 rounded-full font-display font-bold text-[14px] min-h-[44px] ${tab === i ? "t-primary-ct clay-button-active" : "t-card clay-card t-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 0 ? (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={handleNew} className="rounded-2xl t-card clay-card p-6 flex flex-col items-center justify-center gap-2 min-h-[140px] border-2 border-dashed border-[var(--primary-ct)]">
              <span className="w-12 h-12 rounded-full t-primary-ct clay-thumb flex items-center justify-center">
                <Icon name="add" className="text-[24px]" />
              </span>
              <span className="font-display font-bold text-[14px]">New playlist</span>
            </button>
            {playlists.length === 0 ? (
              <div className="col-span-1 rounded-2xl t-card clay-card p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
                <p className="font-display font-bold text-[14px]">No playlists yet</p>
                <p className="text-[12px] t-muted mt-1">Create one to get started.</p>
              </div>
            ) : (
              playlists.map((p) => (
                <Link key={p.id} href={`/playlist?id=${p.id}`} className="rounded-2xl clay-card p-3 min-h-[140px] flex flex-col justify-between t-primary-ct">
                  <span className="flex">
                    <Icon name="queue_music" className="text-[48px]" />
                  </span>
                  <div><p className="font-display font-bold truncate">{p.name}</p><p className="text-[12px] font-bold opacity-70">{p.trackIds.length} tunes</p></div>
                </Link>
              ))
            )}
          </div>
        ) : saved.length === 0 ? (
          <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center mt-2">
            <div className="w-14 h-14 rounded-full t-primary-ct clay-thumb flex items-center justify-center mb-2">
              <Icon name="cloud" fill className="text-[28px]" />
            </div>
            <p className="font-display font-bold text-[16px]">Nothing saved yet</p>
            <p className="text-[13px] t-muted mt-1">Import audio and it will live here.</p>
            <Link href="/search" className="mt-3 h-11 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center min-h-[44px]">
              Add music
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {saved.map((t) => {
              const isCurrent = current?.id === t.id && playing;
              return (
                <button key={t.id} onClick={() => play(t.id)} className="w-full t-card p-3 rounded-2xl clay-card flex items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: t.bg }}>
                      <Icon name={t.icon} className="text-[24px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-[15px] truncate">{t.title}</p>
                      <p className="text-[12px] t-muted truncate">{t.artist}</p>
                    </div>
                  </div>
                  <span className="w-10 h-10 rounded-full t-primary-ct clay-thumb flex items-center justify-center shrink-0">
                    <Icon name={isCurrent ? "pause" : "play_arrow"} fill className="text-[20px]" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <MiniPlayer />
      <BottomNav active="library" />
    </div>
  );
}
