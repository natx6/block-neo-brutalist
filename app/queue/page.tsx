"use client";

import Link from "next/link";

export default function QueuePage() {
  return (
    <div className="bg-[#231534]/40 min-h-dvh max-w-[430px] mx-auto flex flex-col justify-end relative">
      <div className="bg-[#fff7ff] rounded-t-[32px] clay-card p-5 pb-10 min-h-[70dvh]">
        <div className="w-12 h-1.5 rounded-full bg-[#eedbff] mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-[20px]">Queue</h2>
          <Link href="/player" className="w-10 h-10 rounded-full bg-[#f6e9ff] clay-thumb flex items-center justify-center min-w-[44px]">✕</Link>
        </div>
        <p className="font-display font-bold text-[12px] uppercase text-[#64568a]">Now playing</p>
        <div className="bg-white rounded-2xl p-3 clay-card flex items-center gap-3 mt-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#d5c4ff] flex items-center justify-center text-2xl">☁️</div>
          <div className="flex-1 min-w-0"><p className="font-display font-bold truncate">Cotton Candy Clouds</p><p className="text-[12px] truncate">Lofi Pillow • 1:42 / 3:28</p></div>
          <span className="text-[#306385]">〰️</span>
        </div>
        <p className="font-display font-bold text-[12px] uppercase text-[#49454e]">Up next</p>
        <div className="flex flex-col gap-2 mt-2">
          {[
            ["Marshmallow Sunset", "Sweet Pea", "🌅"],
            ["Boba Rain", "Tea Garden", "🧋"],
            ["Lavender Fields", "Slumber Pup", "💜"],
          ].map(([t, a, e]) => (
            <div key={t as string} className="bg-[#fbf0ff] rounded-2xl p-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-xl">{e}</div>
              <div className="flex-1 min-w-0"><p className="font-display font-bold text-[14px] truncate">{t}</p><p className="text-[12px] truncate">{a}</p></div>
              <span>⋮⋮</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
