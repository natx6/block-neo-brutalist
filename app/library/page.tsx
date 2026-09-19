"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";

const TABS = ["Playlists", "Artists", "Albums", "Saved"];
const PLAYLISTS = [
  { title: "Cloud Slumber", count: "32 tunes", bg: "#E9DCFF", icon: "favorite" },
  { title: "Tea & Rain", count: "18 tunes", bg: "#D4F7E6", icon: "coffee" },
  { title: "Midnight Cocoa", count: "24 tunes", bg: "#FFD6B8", icon: "bedtime" },
  { title: "Starlight Hug", count: "12 tunes", bg: "#D1EEFF", icon: "star" },
  { title: "Boba Dreams", count: "21 tunes", bg: "#FFE0D6", icon: "water_drop" },
  { title: "Sunny Puffs", count: "15 tunes", bg: "#FFF2B2", icon: "sunny" },
];

export default function LibraryPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <TopBar title="Library" />
      <main className="flex-1 pt-16 pb-[180px] px-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`shrink-0 h-11 px-5 rounded-full font-display font-bold text-[14px] min-h-[44px] ${tab === i ? "bg-[#d5c4ff] clay-button-active" : "bg-white clay-card text-[#49454e]"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Link href="/playlist" className="rounded-2xl bg-white clay-card p-6 flex flex-col items-center justify-center gap-2 min-h-[140px] border-2 border-dashed border-[#d5c4ff]">
            <span className="w-12 h-12 rounded-full bg-[#d5c4ff] clay-thumb flex items-center justify-center">
              <Icon name="add" className="text-[24px]" />
            </span>
            <span className="font-display font-bold text-[14px]">New playlist</span>
          </Link>
          {PLAYLISTS.map((p) => (
            <Link key={p.title} href="/playlist" className="rounded-2xl clay-card p-3 min-h-[140px] flex flex-col justify-between" style={{ background: p.bg }}>
              <span className="flex">
                <Icon name={p.icon} className="text-[48px]" />
              </span>
              <div><p className="font-display font-bold truncate">{p.title}</p><p className="text-[12px] font-bold opacity-70">{p.count}</p></div>
            </Link>
          ))}
        </div>
      </main>
      <MiniPlayer />
      <BottomNav active="library" />
    </div>
  );
}
