"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../components/Nav";
import { fmtTime } from "../../lib/catalog";
import { listTracks, type SavedTrack } from "../../lib/db";
import { usePlayer } from "../../lib/player-context";

export default function QueuePage() {
  const { current, playing, currentTime, duration, play } = usePlayer();
  const [upNext, setUpNext] = useState<SavedTrack[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const all = await listTracks();
        setUpNext(all.filter((t) => t.id !== current?.id).slice(0, 5));
      } catch {}
    })();
  }, [current?.id]);

  return (
    <div className="bg-[#231534]/40 h-dvh w-full flex flex-col justify-end relative overflow-hidden">
      <div className="t-bg rounded-t-[32px] clay-card p-5 pb-10 min-h-[70dvh] w-full max-w-[430px] mx-auto">
        <div className="w-12 h-1.5 rounded-full t-variant mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-[20px]">Queue</h2>
          <Link href="/player" aria-label="Close queue" className="w-10 h-10 rounded-full t-container clay-thumb flex items-center justify-center min-w-[44px]">
            <Icon name="close" className="text-[20px]" />
          </Link>
        </div>
        <p className="font-display font-bold text-[12px] uppercase t-primary-text">Now playing</p>
        {current ? (
          <div className="t-card rounded-2xl p-3 clay-card flex items-center gap-3 mt-2 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: current.bg }}>
              <Icon name={current.icon} className="text-[24px]" fill />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold truncate">{current.title}</p>
              <p className="text-[12px] truncate">{current.artist} • {fmtTime(currentTime)} / {fmtTime(duration)}</p>
            </div>
            <span className="t-secondary-text flex items-center">
              <Icon name={playing ? "pause" : "fiber_manual_record"} className="text-[20px]" />
            </span>
          </div>
        ) : (
          <div className="t-card rounded-2xl p-5 clay-card flex flex-col items-center text-center mt-2 mb-4">
            <p className="font-display font-bold text-[16px]">Nothing playing</p>
            <Link href="/" className="mt-2 font-display font-bold text-[13px] t-primary-text">Pick something from Home</Link>
          </div>
        )}
        <p className="font-display font-bold text-[12px] uppercase t-muted">Up next</p>
        <div className="flex flex-col gap-2 mt-2">
          {upNext.length === 0 ? (
            <p className="text-[13px] t-muted">Your queue is empty.</p>
          ) : (
            upNext.map((t) => (
              <button key={t.id} onClick={() => play(t.id)} className="t-surface rounded-2xl p-3 flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center" style={{ background: t.bg }}>
                  <Icon name={t.icon} className="text-[22px]" />
                </div>
                <div className="flex-1 min-w-0"><p className="font-display font-bold text-[14px] truncate">{t.title}</p><p className="text-[12px] truncate">{t.artist}</p></div>
                <span className="flex items-center">
                  <Icon name="play_arrow" className="text-[20px]" />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
