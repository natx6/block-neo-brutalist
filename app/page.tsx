"use client";

import { useState } from "react";

const RECENT = [
  { title: "Marshmallow Sunset", artist: "Sweet Pea", bg: "#FFE0D6", emoji: "🌅" },
  { title: "Boba Rain", artist: "Tea Garden", bg: "#D4F7E6", emoji: "🧋" },
  { title: "Lavender Fields", artist: "Slumber Pup", bg: "#E9DCFF", emoji: "💜" },
  { title: "Starlight Hug", artist: "Fluff", bg: "#D1EEFF", emoji: "⭐" },
];

const MOODS = [
  { title: "Happy", sub: "Sun-kissed beats", bg: "bg-[#FFF2B2]", dot: "bg-[#FFE580]", text: "text-[#574400]", subText: "text-[#7A6000]", emoji: "☀️" },
  { title: "Cozy", sub: "Warm hot cocoa", bg: "bg-[#FFD6B8]", dot: "bg-[#FFBE94]", text: "text-[#5A2B0F]", subText: "text-[#7B3F1B]", emoji: "☕" },
  { title: "Focus", sub: "Gentle flow state", bg: "bg-[#C7F5DC]", dot: "bg-[#A8ECC4]", text: "text-[#144D32]", subText: "text-[#1E6B47]", emoji: "🌱" },
  { title: "Dreamy", sub: "Bedtime melodies", bg: "bg-[#E2D4FF]", dot: "bg-[#CFBCFA]", text: "text-[#352561]", subText: "text-[#4A387E]", emoji: "🌙" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [sleepOn, setSleepOn] = useState(true);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#fff7ff]/80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#d5c4ff] clay-thumb flex items-center justify-center text-xl">☁️</div>
            <span className="font-display font-bold text-[22px]">Puff</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[12px] text-[#49454e]">Home</span>
            <div className="w-8 h-8 rounded-full bg-[#64568a] flex items-center justify-center text-white text-sm">☺</div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-[160px]">
        {/* Greeting */}
        <div className="px-5 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full bg-[#d5c4ff] clay-card flex items-center justify-center text-2xl">
              ☁️
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute h-full w-full rounded-full bg-[#ffbbc2] opacity-75" />
                <span className="relative rounded-full h-2.5 w-2.5 bg-[#944652]" />
              </span>
            </div>
            <div>
              <p className="font-display font-bold text-[18px]">Good afternoon! ✨</p>
              <p className="text-[12px] text-[#49454e] font-medium">Sweet Pea&apos;s Sanctuary</p>
            </div>
          </div>
          <button className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center text-[#64568a] text-xl min-w-[44px] min-h-[44px]">🔔</button>
        </div>

        {/* Search */}
        <div className="px-5 mt-4">
          <div className="flex items-center w-full h-[52px] rounded-full bg-[#fbf0ff] px-4 shadow-[inset_2px_2px_5px_rgba(74,59,92,0.12),inset_-2px_-2px_6px_rgba(255,255,255,0.9)]">
            <div className="w-8 h-8 rounded-full bg-[#a6d7fe] flex items-center justify-center shrink-0">🔍</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find dreamy tunes, sleepy beats..."
              className="w-full bg-transparent pl-3 text-[14px] font-medium focus:outline-none placeholder:text-[#7a757f] min-w-0"
            />
            <button className="text-lg opacity-60 min-w-[44px] min-h-[44px]">🎙️</button>
          </div>
        </div>

        {/* Recently played */}
        <div className="mt-6">
          <div className="px-5 flex items-center justify-between mb-2">
            <p className="font-display font-bold text-[22px]">Recently Played 🎧</p>
            <button className="font-display font-bold text-[12px] text-[#64568a]">See all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-3 pt-1 no-scrollbar">
            {RECENT.map((r) => (
              <button key={r.title} onClick={() => setPlaying(!playing)} className="flex flex-col gap-2 shrink-0 w-[140px] text-left active:scale-95 transition-transform">
                <div className="relative w-[140px] h-[140px] rounded-[28px] p-2 clay-card flex items-center justify-center" style={{ background: r.bg }}>
                  <div className="w-full h-full rounded-[20px] bg-white/60 flex items-center justify-center text-6xl">{r.emoji}</div>
                  <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[#d5c4ff] clay-thumb flex items-center justify-center text-white">
                    {playing ? "⏸" : "▶"}
                  </div>
                </div>
                <div className="px-1">
                  <p className="font-display font-bold text-[14px] truncate">{r.title}</p>
                  <p className="text-[12px] text-[#49454e] truncate">{r.artist}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Daily mix */}
        <div className="px-5 mt-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#f6e9ff] to-[#eedbff] p-4 clay-card">
            <div className="flex items-center justify-between">
              <div className="max-w-[210px]">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ffd9dc] font-display font-bold text-[11px]">✨ Daily Cozy Mix</span>
                <h3 className="font-display font-bold text-[18px] mt-1">Cloud Slumber &amp; Tea</h3>
                <p className="text-[12px] text-[#49454e]">32 dreamy lo-fi acoustics • 1h 48m</p>
              </div>
              <button onClick={() => setPlaying(!playing)} className="w-14 h-14 rounded-full bg-[#64568a] text-white clay-button-active flex items-center justify-center text-2xl min-w-[56px] min-h-[56px] active:scale-90">
                {playing ? "⏸" : "▶"}
              </button>
            </div>
            <p className="font-display font-bold text-[11px] text-[#64568a] mt-3">● Freshly brewed for you</p>
          </div>
        </div>

        {/* Moods */}
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-bold text-[22px]">Moods &amp; Vibes 🍬</p>
            <span className="text-[11px] text-[#49454e] font-medium">Pick a feeling</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map((m) => (
              <button key={m.title} className={`${m.bg} h-28 rounded-2xl p-3.5 clay-card flex flex-col justify-between text-left active:scale-95 transition-transform min-h-[112px]`}>
                <div className="flex items-start justify-between">
                  <span className={`w-10 h-10 rounded-full ${m.dot} flex items-center justify-center text-[22px]`}>{m.emoji}</span>
                  <span className="text-lg opacity-50">↗</span>
                </div>
                <div>
                  <p className={`font-display font-bold text-[18px] ${m.text}`}>{m.title}</p>
                  <p className={`text-[11px] font-bold ${m.subText}`}>{m.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sleep timer */}
        <div className="px-5 mt-4">
          <div className="p-4 rounded-2xl bg-white clay-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#c9e6ff] flex items-center justify-center text-lg">🌙</div>
              <div>
                <p className="font-display font-bold text-[14px]">Sleep Timer</p>
                <p className="text-[12px] text-[#49454e]">Auto fade in 30 mins</p>
              </div>
            </div>
            <button
              onClick={() => setSleepOn(!sleepOn)}
              className={`w-12 h-7 rounded-full p-0.5 relative min-w-[48px] ${sleepOn ? "bg-[#d5c4ff]" : "bg-[#eedbff]"}`}
              aria-checked={sleepOn}
              role="switch"
            >
              <div className={`w-6 h-6 rounded-full bg-white clay-thumb transition-transform ${sleepOn ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <p className="text-[11px] text-[#49454e] mt-3 text-center">FACE 1/4 — Home. Search + Player + Offline land next.</p>
        </div>
      </main>

      {/* Mini player */}
      <aside className="fixed bottom-[88px] inset-x-0 z-40 px-5 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-[390px] h-[60px] bg-white/95 rounded-full px-3 flex items-center justify-between clay-pill">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-full bg-[#d5c4ff] clay-thumb flex items-center justify-center shrink-0">🎵</div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-[14px] truncate">Cotton Candy Clouds</p>
              <p className="text-[11px] text-[#944652] truncate font-bold">Lofi Pillow</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button className="w-11 h-11 flex items-center justify-center text-lg min-w-[44px] min-h-[44px]">♡</button>
            <button onClick={() => setPlaying(!playing)} className="w-11 h-11 rounded-full bg-[#64568a] text-white clay-button-active flex items-center justify-center min-w-[44px] min-h-[44px]">
              {playing ? "⏸" : "▶"}
            </button>
          </div>
        </div>
      </aside>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe px-5 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-[390px] h-16 bg-white/90 rounded-full mb-2 px-2 flex items-center justify-around clay-pill">
          {[
            { label: "Home", icon: "🏠", active: true },
            { label: "Search", icon: "🔍", active: false },
            { label: "Library", icon: "📚", active: false },
            { label: "Offline", icon: "☁️", active: false },
          ].map((n) => (
            <span
              key={n.label}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-full min-w-[56px] min-h-[48px] ${n.active ? "bg-[#d5c4ff] clay-button-active font-bold" : "text-[#49454e]"}`}
            >
              <span className="text-[20px] leading-none">{n.icon}</span>
              <span className="font-display font-bold text-[10px]">{n.label}</span>
            </span>
          ))}
        </div>
      </nav>
    </div>
  );
}
