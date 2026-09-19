"use client";

import Link from "next/link";
import { useState } from "react";

export function MiniPlayer() {
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  return (
    <aside className="fixed bottom-[88px] inset-x-0 z-40 px-5 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[390px] h-[60px] bg-white/95 rounded-full px-3 flex items-center justify-between clay-pill">
        <Link href="/player" className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-full bg-[#d5c4ff] clay-thumb flex items-center justify-center shrink-0">🎵</div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-[14px] truncate">Cotton Candy Clouds</p>
            <p className="text-[11px] text-[#944652] truncate font-bold">Lofi Pillow</p>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setLiked(!liked)} aria-label="Favorite" className="w-11 h-11 flex items-center justify-center text-lg min-w-[44px] min-h-[44px]">
            {liked ? "❤️" : "♡"}
          </button>
          <button onClick={() => setPlaying(!playing)} aria-label="Play or Pause" className="w-11 h-11 rounded-full bg-[#64568a] text-white clay-button-active flex items-center justify-center min-w-[44px] min-h-[44px]">
            {playing ? "⏸" : "▶"}
          </button>
        </div>
      </div>
    </aside>
  );
}

const TABS = [
  { href: "/", label: "Home", icon: "🏠", id: "home" },
  { href: "/search", label: "Search", icon: "🔍", id: "search" },
  { href: "/library", label: "Library", icon: "📚", id: "library" },
  { href: "/offline", label: "Offline", icon: "☁️", id: "offline" },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe px-5 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[390px] h-16 bg-white/90 rounded-full mb-2 px-2 flex items-center justify-around clay-pill">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-full min-w-[56px] min-h-[48px] ${
              active === t.id ? "bg-[#d5c4ff] clay-button-active font-bold" : "text-[#49454e]"
            }`}
          >
            <span className="text-[20px] leading-none">{t.icon}</span>
            <span className="font-display font-bold text-[10px]">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#fff7ff]/80 backdrop-blur-xl">
      <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-[#d5c4ff] clay-thumb flex items-center justify-center text-xl">☁️</div>
          <span className="font-display font-bold text-[22px]">Puff</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-[12px] text-[#49454e]">{title}</span>
          {right ?? (
            <div className="w-8 h-8 rounded-full bg-[#64568a] flex items-center justify-center text-white text-sm">☺</div>
          )}
        </div>
      </div>
    </header>
  );
}
