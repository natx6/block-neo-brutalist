"use client";

import { useState } from "react";

const MOODS = [
  {
    id: "chill",
    title: "CHILL",
    sub: "Tape hiss & dusty keys",
    badge: "LO-FI 70BPM",
    bg: "bg-[#bbc3ff]",
    icon: "🌙",
    rotate: "-rotate-2",
  },
  {
    id: "hype",
    title: "HYPE",
    sub: "Bass kicks & high speed",
    badge: "160 BPM",
    bg: "bg-[#ff5da2]",
    icon: "🔥",
    text: "text-[#650036]",
    rotate: "rotate-2",
  },
  {
    id: "focus",
    title: "FOCUS",
    sub: "Deep brain wave states",
    badge: "SYNTH PULSE",
    bg: "bg-[#1c3fe7]",
    icon: "🎯",
    text: "text-white",
    rotate: "rotate-1",
  },
  {
    id: "sad",
    title: "SAD",
    sub: "Cathartic tear-jerkers",
    badge: "RAIN DROP",
    bg: "bg-[#9ed81f]",
    icon: "🌧️",
    rotate: "-rotate-1",
  },
];

const ROTATION = [
  { title: "HYPERDRIVE", artist: "CYBER-PUNK X", time: "03:42", tag: "SIDE A", bg: "bg-[#ffd9e3]", art: "bg-gradient-to-br from-[#ff5da2] to-[#650036]", emoji: "📼" },
  { title: "NEON WASTELAND", artist: "VALKYRIE ZERO", time: "04:18", tag: "HOT 100", bg: "bg-[#dee0ff]", art: "bg-gradient-to-br from-[#405cff] to-[#000f5d]", emoji: "🌃" },
  { title: "PLASTIC SOUL", artist: "THE CRATES", time: "02:54", tag: "REMIX", bg: "bg-[#f1e39c]", art: "bg-gradient-to-br from-[#f7e9a1] to-[#b21c66]", emoji: "💿" },
  { title: "FUZZ BOX", artist: "STATIC RIOT", time: "03:11", tag: "GARAGE", bg: "bg-[#b9f53f]", art: "bg-gradient-to-br from-[#b6f23c] to-[#243600]", emoji: "🎸" },
];

const CHIPS = ["#SYNTHWAVE", "#90S_BREAKS", "#GLITCH", "#DEEP_DUB"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [miniPlaying, setMiniPlaying] = useState(false);

  return (
    <div className="bg-[#fff9eb] min-h-dvh flex flex-col max-w-md mx-auto relative border-x-[3px] border-black/10">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#fff9eb]/90 backdrop-blur-md pt-safe">
        <div className="max-w-md mx-auto h-16 px-5 flex items-center justify-between">
          <div className="font-display font-bold text-2xl tracking-tighter border-[3px] border-black bg-white px-2 py-0.5 shadow-[3px_3px_0_#121212] -rotate-2">
            BLOCK<span className="text-[#b21c66]">■</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm uppercase text-[#574148]">Find</span>
            <div className="w-8 h-8 rounded-full bg-[#b21c66] border-[3px] border-black flex items-center justify-center text-white text-sm">
              ☺
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pt-20 pb-48">
        {/* GREETING */}
        <section className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#ff5da2] text-[#650036] font-display font-bold text-[12px] uppercase tracking-widest brutal-xs -rotate-3">
              ⚡ DAILY DROP // VOL. 042
            </div>
            <div className="px-2 py-0.5 rounded bg-[#f7e9a1] font-display font-bold text-[10px] uppercase tracking-widest border-2 border-black rotate-2">
              TAPE ARCHIVE
            </div>
          </div>
          <div className="relative">
            <h1 className="font-display font-bold uppercase leading-[0.95] tracking-tight text-[38px]">
              WHAT&apos;S THE<br />
              <span className="text-[#b21c66] underline decoration-[#1c3fe7] decoration-4 underline-offset-4">
                VIBE?
              </span>
            </h1>
            <div className="absolute top-0 right-1 w-12 h-12 rounded-full bg-[#b9f53f] border-[3px] border-black flex items-center justify-center font-display font-bold text-[10px] text-center leading-tight rotate-12 shadow-[3px_3px_0_#121212]">
              RAW<br />AUDIO
            </div>
          </div>
        </section>

        {/* SEARCH */}
        <section className="mt-5">
          <form
            className="flex items-center w-full bg-white rounded-xl brutal p-1.5 focus-within:shadow-[6px_6px_0_#1c3fe7]"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="pl-2 pr-1 text-xl">🔍</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tracks, moods, tapes..."
              className="w-full bg-transparent font-medium text-[16px] focus:outline-none py-2.5 min-w-0 placeholder:text-[#574148]/70"
            />
            <button className="h-11 px-5 rounded-lg bg-[#b9f53f] font-display font-bold uppercase brutal-xs pressable shrink-0 ml-1">
              GO
            </button>
          </form>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3 pb-1">
            {CHIPS.map((c, i) => (
              <button
                key={c}
                className={`px-3 py-1 rounded-full bg-white font-display font-bold text-[12px] uppercase brutal-xs pressable shrink-0 ${i % 2 ? "rotate-1" : "-rotate-1"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* MOODS */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-display font-bold text-[20px] uppercase">Select Frequency</h2>
            <span className="font-display font-bold text-[10px] tracking-widest text-[#574148]">[ 4 CHANNELS ]</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMood(m.id === activeMood ? null : m.id)}
                className={`relative flex flex-col justify-between p-3 rounded-xl ${m.bg} ${m.text ?? "text-[#000f5d]"} brutal pressable min-h-[148px] text-left ${activeMood === m.id ? "outline outline-4 outline-[#121212] -translate-x-[2px] -translate-y-[2px]" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded bg-white text-black font-display font-bold text-[10px] uppercase border-2 border-black shadow-[2px_2px_0_#121212] -rotate-2">
                    {m.badge}
                  </span>
                  <span className="text-2xl">{m.icon}</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-[28px] uppercase leading-none">{m.title}</h3>
                  <p className="text-[13px] font-medium opacity-90 mt-1">{m.sub}</p>
                  {activeMood === m.id && (
                    <p className="mt-1 inline-block px-2 py-0.5 bg-black text-[#b6f23c] text-[10px] font-bold rounded">● TUNED IN</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* HEAVY ROTATION */}
        <section className="mt-7">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-[20px] uppercase">Heavy Rotation</h2>
              <span className="w-2.5 h-2.5 rounded-full bg-[#b21c66] animate-ping" />
            </div>
            <span className="font-display font-bold text-[14px] uppercase text-[#1c3fe7]">SEE ALL ›</span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-3 pt-1">
            {ROTATION.map((r) => (
              <article key={r.title} className={`w-60 shrink-0 ${r.bg} rounded-xl p-3 brutal pressable`}>
                <div className={`relative w-full aspect-square rounded-lg overflow-hidden border-[3px] border-black mb-3 ${r.art} flex items-center justify-center text-7xl`}>
                  {r.emoji}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white text-black font-display font-bold text-[10px] uppercase border-2 border-black -rotate-2">
                    {r.tag}
                  </span>
                  <button
                    aria-label={`Play ${r.title}`}
                    onClick={() => setPlaying(!playing)}
                    className="absolute bottom-2 right-2 w-10 h-10 rounded bg-[#b6f23c] border-[3px] border-black flex items-center justify-center text-lg shadow-[2px_2px_0_#121212] active:scale-90"
                  >
                    {playing ? "⏸" : "▶"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-display font-bold text-[16px] uppercase truncate">{r.title}</h4>
                  <span className="font-display font-bold text-[10px] shrink-0">{r.time}</span>
                </div>
                <p className="text-[13px] font-medium opacity-80 truncate">{r.artist}</p>
              </article>
            ))}
          </div>
        </section>

        {/* TAPE RIG */}
        <section className="mt-4 p-4 rounded-xl bg-[#fdefa6] brutal flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#1c3fe7] border-2 border-black" />
              <span className="font-display font-bold text-[16px] uppercase">Analog Tape Rig</span>
            </div>
            <span className="font-display font-bold text-[10px] bg-[#f1e39c] px-2 py-0.5 rounded border-2 border-black uppercase">Deck Ready</span>
          </div>
          <div className="flex items-end justify-between h-14 bg-white rounded-lg p-2.5 border-[3px] border-black gap-1">
            {[45, 80, 60, 100, 75, 30, 90, 50].map((h, i) => (
              <div
                key={i}
                className={`w-full rounded-sm eq-bar ${i % 3 === 0 ? "bg-[#ff5da2]" : i % 3 === 1 ? "bg-[#405cff]" : "bg-[#78a700]"}`}
                style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["⏪ REWIND", "🔀 RANDOM", "🎛 PREAMP"].map((t) => (
              <button key={t} className="py-2 rounded-lg bg-white font-display font-bold text-[11px] uppercase brutal-xs pressable">
                {t}
              </button>
            ))}
          </div>
          {/* Phase note */}
          <p className="text-[12px] font-medium text-[#574148] border-t-2 border-dashed border-black/30 pt-2">
            FACE 1 / 4 — Home only. Search + Player + Offline stash land in Face 2–4. Real downloads need the Fly.io worker (see README).
          </p>
        </section>
      </main>

      {/* MINI PLAYER */}
      <div className="fixed bottom-24 inset-x-0 z-40 px-5 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto bg-[#fdefa6] border-[3px] border-black rounded-xl p-2 shadow-[4px_4px_0_#121212] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-[#1c3fe7] border-[3px] border-black flex items-center justify-center text-white shrink-0">🎚️</div>
            <div className="min-w-0">
              <p className="font-display font-bold text-[13px] uppercase truncate">SUPERSONIC - HYPERPOP CLUB</p>
              <p className="text-[12px] text-[#574148] truncate">NEO-KIDD // TAPE DECK A</p>
            </div>
          </div>
          <button
            onClick={() => setMiniPlaying(!miniPlaying)}
            className="w-11 h-11 rounded-lg bg-[#b6f23c] border-[3px] border-black flex items-center justify-center text-lg shrink-0 active:scale-95"
          >
            {miniPlaying ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#fff9eb]/90 backdrop-blur-md pb-safe border-t-[3px] border-black">
        <div className="max-w-md mx-auto flex justify-around items-center h-20 px-2">
          <span className="flex flex-col items-center w-16 h-14 justify-center rounded-lg bg-[#ff5da2] text-[#650036] border-[3px] border-black shadow-[3px_3px_0_#121212] font-bold">
            <span className="text-xl">🔍</span>
            <span className="font-display font-bold text-[10px] uppercase">Find</span>
          </span>
          <span className="flex flex-col items-center w-16 h-14 justify-center text-[#574148] opacity-60">
            <span className="text-xl">📼</span>
            <span className="font-display font-bold text-[10px] uppercase">Stash</span>
          </span>
          <span className="flex flex-col items-center w-16 h-14 justify-center text-[#574148] opacity-60">
            <span className="text-xl">🎧</span>
            <span className="font-display font-bold text-[10px] uppercase">Deck</span>
          </span>
        </div>
      </nav>
    </div>
  );
}
