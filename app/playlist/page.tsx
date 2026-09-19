"use client";

import { useState } from "react";
import Link from "next/link";

const TRACKS = [
  { t: "Cotton Candy Clouds", a: "Lofi Pillow", d: "3:28", e: "☁️" },
  { t: "Marshmallow Sunset", a: "Sweet Pea", d: "3:14", e: "🌅" },
  { t: "Boba Rain", a: "Tea Garden", d: "2:56", e: "🧋" },
  { t: "Lavender Fields", a: "Slumber Pup", d: "4:02", e: "💜" },
  { t: "Starlight Hug", a: "Fluff", d: "3:41", e: "⭐" },
];

export default function PlaylistPage() {
  const [saveAll, setSaveAll] = useState(true);
  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#fff7ff]/80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/library" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px]">‹</Link>
            <h1 className="font-display font-bold">Playlist</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#64568a] flex items-center justify-center text-white text-sm">☺</div>
        </div>
      </header>
      <main className="flex-1 pt-20 pb-10 px-5 flex flex-col gap-4">
        <div className="rounded-[28px] bg-gradient-to-br from-[#E9DCFF] to-[#D1EEFF] clay-card p-6 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-[24px] bg-white clay-card flex items-center justify-center text-7xl">☁️</div>
          <h2 className="font-display font-bold text-[24px] mt-3">Cloud Slumber &amp; Tea</h2>
          <p className="text-[13px] text-[#49454e]">32 dreamy lo-fi acoustics • 1h 48m</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="font-display font-bold text-[12px]">Save all</span>
            <button onClick={() => setSaveAll(!saveAll)} className={`w-12 h-7 rounded-full p-0.5 ${saveAll ? "bg-[#d5c4ff]" : "bg-[#eedbff]"}`}>
              <div className={`w-6 h-6 rounded-full bg-white clay-thumb transition-transform ${saveAll ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="h-14 rounded-full bg-[#64568a] text-white font-display font-bold clay-button-active min-h-[56px]">▶ PLAY</button>
          <button className="h-14 rounded-full bg-white font-display font-bold clay-card min-h-[56px]">🔀 SHUFFLE</button>
        </div>
        <div className="flex flex-col gap-2">
          {TRACKS.map((s, i) => (
            <div key={s.t} className="bg-white rounded-2xl p-3 clay-card flex items-center gap-3">
              <span className="font-display font-bold text-[12px] w-5">{String(i + 1).padStart(2, "0")}</span>
              <div className="w-11 h-11 rounded-2xl bg-[#f6e9ff] flex items-center justify-center text-xl shrink-0">{s.e}</div>
              <div className="min-w-0 flex-1"><p className="font-display font-bold text-[14px] truncate">{s.t}</p><p className="text-[12px] truncate">{s.a}</p></div>
              <span className="text-[11px] font-bold">{s.d}</span>
              <span className="text-[#49454e]">⋮⋮</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
