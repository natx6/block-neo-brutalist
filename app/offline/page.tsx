"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";
import { fmtMB } from "../../lib/catalog";
import { listTracks, removeTrack, stashSize, type SavedTrack } from "../../lib/db";
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

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <TopBar title="Offline" />
      <main className="flex-1 pt-16 pb-[180px] px-5 flex flex-col gap-4">
        <div className="w-full bg-[#c9e6ff] rounded-2xl p-4 clay-card flex items-center gap-4 mt-3">
          <div className="w-14 h-14 rounded-full bg-white clay-thumb flex items-center justify-center shrink-0">
            <Icon name="cloud_download" className="text-[28px]" fill />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-[18px]">Cozy Haven</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#306385] text-white">Active</span>
            </div>
            <p className="text-[14px] font-medium">You&apos;re offline, but your saved songs are here!</p>
          </div>
        </div>

        <div className="w-full bg-[#fbf0ff] rounded-2xl p-4 clay-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-[14px] flex items-center gap-1.5">
              <Icon name="pie_chart" className="text-[18px]" /> Puff Stash
            </span>
            <span className="font-display font-bold text-[12px] text-[#64568a]">{pct}% Filled</span>
          </div>
          <div className="w-full h-7 rounded-full bg-[#eedbff] p-1 shadow-[inset_2px_2px_5px_rgba(74,59,92,0.18)]">
            <div className="h-full rounded-full bg-[#a6d7fe] clay-thumb" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="flex justify-between text-[12px] font-medium">
            <span>{fmtMB(size)} saved • {tracks.length} songs</span>
            <button onClick={refresh} className="px-3 py-1.5 rounded-full bg-white clay-card font-display font-bold text-[12px]">Refresh</button>
          </div>
        </div>

        <div className="w-full bg-[#f6e9ff] rounded-2xl p-4 clay-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#e9ddff] clay-thumb flex items-center justify-center">
              <Icon name="airplanemode_active" className="text-[22px]" />
            </div>
            <div>
              <p className="font-display font-bold">Offline Mode</p>
              <p className="text-[12px]">Only play downloaded tunes</p>
            </div>
          </div>
          <button onClick={() => setOfflineMode(!offlineMode)} role="switch" aria-checked={offlineMode} className={`w-16 h-9 rounded-full p-1 min-w-[64px] ${offlineMode ? "bg-[#a6d7fe]" : "bg-[#eedbff]"}`}>
            <div className={`w-7 h-7 rounded-full bg-white clay-thumb transition-transform ${offlineMode ? "translate-x-7" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="w-full bg-[#fbf0ff] rounded-2xl p-4 clay-card flex flex-col gap-3">
          <p className="font-display font-bold">Download Queue</p>
          {active.length === 0 ? (
            <p className="text-[13px] text-[#49454e]">Queue clear — nothing downloading.</p>
          ) : (
            active.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl p-3 clay-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display font-bold text-[12px] truncate">{d.label}</p>
                  <span className="font-bold text-[12px]">{d.pct}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#f2e2ff] p-0.5">
                  <div className="h-full rounded-full bg-[#a6d7fe]" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="font-display font-bold text-[22px]">Downloaded Tunes <span className="text-[12px] bg-[#e9ddff] rounded-full px-2 py-0.5">{tracks.length}</span></p>
        </div>

        {tracks.length === 0 ? (
          <div className="w-full bg-white p-6 rounded-2xl clay-card flex flex-col items-center text-center">
            <p className="font-display font-bold text-[16px]">No tunes yet — add from Search.</p>
            <Link href="/search" className="mt-3 h-11 px-6 rounded-full bg-[#64568a] text-white font-display font-bold text-[14px] clay-button-active flex items-center min-h-[44px]">
              Go to Search
            </Link>
          </div>
        ) : (
          tracks.map((s) => {
            const isCurrent = current?.id === s.id && playing;
            return (
              <div key={s.id} className="w-full bg-white rounded-2xl p-3 clay-card flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#f6e9ff] flex items-center justify-center" style={{ background: s.bg }}>
                    <Icon name={s.icon} className="text-[24px]" />
                  </div>
                  <div className="min-w-0"><p className="font-display font-bold truncate">{s.title}</p><p className="text-[12px] text-[#944652] truncate">{s.artist}</p></div>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => play(s.id)} aria-label={`Play ${s.title}`} className="w-10 h-10 rounded-full bg-[#d5c4ff] clay-card flex items-center justify-center min-w-[44px]">
                    <Icon name={isCurrent ? "pause" : "play_arrow"} fill className="text-[20px]" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} aria-label={`Delete ${s.title}`} className="w-10 h-10 rounded-full bg-[#ffbbc2] clay-card flex items-center justify-center min-w-[44px]">
                    <Icon name="delete" className="text-[20px]" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="w-full bg-[#eedbff]/40 rounded-2xl p-4 clay-card flex gap-3 items-start">
          <Icon name="lightbulb" className="text-[20px]" />
          <p className="text-[12px]">Tip: everything here plays in airplane mode.</p>
        </div>
      </main>
      <MiniPlayer />
      <BottomNav active="offline" />
    </div>
  );
}
