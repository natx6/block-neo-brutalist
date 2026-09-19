"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "../components/Nav";

export default function PlayerPage() {
  const [playing, setPlaying] = useState(true);
  const [liked, setLiked] = useState(true);
  const [progress, setProgress] = useState(48);

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#fff7ff]/80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px]">‹</Link>
            <h1 className="font-display font-bold text-[18px]">Now Playing</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#64568a] flex items-center justify-center text-white">
            <Icon name="person" className="text-[18px]" />
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-10 px-5">
        <div className="absolute -top-16 -left-12 w-64 h-64 rounded-full bg-[#a6d7fe]/40 blur-3xl pointer-events-none" />
        <div className="absolute top-44 -right-16 w-72 h-72 rounded-full bg-[#ffbbc2]/35 blur-3xl pointer-events-none" />

        <div className="flex justify-center pt-2 pb-6">
          <div className="relative w-[280px] h-[280px] rounded-[32px] p-4 bg-white clay-card flex items-center justify-center">
            <div className="absolute top-6 left-8 right-8 h-8 rounded-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none z-10" />
            <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-[#FFE0D6] via-[#E9DCFF] to-[#D1EEFF] flex items-center justify-center gap-2 text-[#4c3f70]">
              <Icon name="cloud" className="text-[72px]" fill />
              <Icon name="music_note" className="text-[64px]" />
            </div>
            <div className="absolute -bottom-3 right-5 px-3 py-1 rounded-full bg-white clay-thumb flex items-center gap-1.5 z-20">
              <span className="w-2 h-2 rounded-full bg-[#306385] animate-pulse" />
              <span className="font-display font-bold text-[11px] tracking-wider uppercase">Lo-Fi Master</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 mb-6">
          <div className="min-w-0 pr-4">
            <h2 className="font-display font-bold text-[22px] truncate">Cotton Candy Clouds</h2>
            <p className="font-bold text-[14px] text-[#49454e] truncate">● Lofi Pillow</p>
          </div>
          <button onClick={() => setLiked(!liked)} aria-label="Favorite" className="w-12 h-12 rounded-full bg-white clay-card flex items-center justify-center min-w-[48px] min-h-[48px]">
            <Icon name="favorite" fill={liked} className="text-[28px]" />
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-8">
          <div
            className="relative w-full h-8 flex items-center cursor-pointer"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setProgress(Math.round(((e.clientX - r.left) / r.width) * 100));
            }}
          >
            <div className="w-full h-3 rounded-full bg-[#f2e2ff] shadow-[inset_2px_2px_4px_rgba(74,59,92,0.14)] p-[2px]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#a6d7fe] via-[#d5c4ff] to-[#64568a]" style={{ width: `${progress}%` }} />
            </div>
            <div className="absolute w-6 h-6 rounded-full bg-white clay-thumb flex items-center justify-center" style={{ left: `${progress}%`, transform: "translateX(-50%)" }}>
              <div className="w-2.5 h-2.5 rounded-full bg-[#64568a]" />
            </div>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="font-display font-bold text-[11px]">1:42</span>
            <span className="px-2 py-0.5 rounded-full bg-[#f6e9ff] text-[11px] font-bold">FLAC 48kHz</span>
            <span className="font-display font-bold text-[11px]">3:28</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 mb-8">
          <button aria-label="Shuffle" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px] min-h-[44px]">
            <Icon name="shuffle" />
          </button>
          <button aria-label="Previous" className="w-[52px] h-[52px] rounded-full bg-[#e9ddff] clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
            <Icon name="skip_previous" fill />
          </button>
          <button onClick={() => setPlaying(!playing)} aria-label="Play or pause" className="w-[72px] h-[72px] rounded-full bg-[#ffbbc2] clay-card flex items-center justify-center min-w-[72px] min-h-[72px] active:scale-95">
            <Icon name={playing ? "pause" : "play_arrow"} fill className="text-[36px]" />
          </button>
          <button aria-label="Next" className="w-[52px] h-[52px] rounded-full bg-[#c9e6ff] clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
            <Icon name="skip_next" fill />
          </button>
          <button aria-label="Repeat" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px] min-h-[44px]">
            <Icon name="repeat_one" />
          </button>
        </div>

        <div className="w-full bg-[#f6e9ff]/60 rounded-[28px] p-3 clay-card flex items-center justify-around">
          {[
            { icon: "download", label: "Saved" },
            { icon: "add", label: "Add" },
            { icon: "share", label: "Share" },
            { icon: "queue_music", label: "Queue", href: "/queue" },
          ].map((b) => (
            <Link key={b.label} href={b.href ?? "/player"} className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
              <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
                <Icon name={b.icon} className="text-[20px]" />
              </div>
              <span className="font-display font-bold text-[11px]">{b.label}</span>
            </Link>
          ))}
        </div>

        <Link href="/" className="block text-center mt-6 font-display font-bold text-[12px] text-[#64568a]">← Back Home</Link>
      </main>
    </div>
  );
}
