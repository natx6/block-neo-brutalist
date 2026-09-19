"use client";

import { useState } from "react";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";

export default function OfflinePage() {
  const [offlineOn, setOfflineOn] = useState(true);

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
            <span className="font-display font-bold text-[12px] text-[#64568a]">65% Filled</span>
          </div>
          <div className="w-full h-7 rounded-full bg-[#eedbff] p-1 shadow-[inset_2px_2px_5px_rgba(74,59,92,0.18)]">
            <div className="h-full rounded-full bg-[#a6d7fe] clay-thumb" style={{ width: "65%" }} />
          </div>
          <div className="flex justify-between text-[12px] font-medium">
            <span>Storage Used: 2.4 GB of 4.0 GB</span>
            <span className="px-2 py-0.5 rounded-full bg-[#f2e2ff] font-bold">142 songs</span>
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
          <button onClick={() => setOfflineOn(!offlineOn)} role="switch" aria-checked={offlineOn} className={`w-16 h-9 rounded-full p-1 min-w-[64px] ${offlineOn ? "bg-[#a6d7fe]" : "bg-[#eedbff]"}`}>
            <div className={`w-7 h-7 rounded-full bg-white clay-thumb transition-transform ${offlineOn ? "translate-x-7" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="w-full bg-[#fbf0ff] rounded-2xl p-4 clay-card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">Download Queue <span className="text-[11px] text-[#944652]">Downloading 2</span></p>
            <button className="px-3 py-2 rounded-full bg-white clay-card font-display font-bold text-[12px] min-h-[44px]">Pause All</button>
          </div>
          {[
            { t: "Warm Honey Milk", a: "Snooze Bear", p: 84, icon: "water_drop" },
            { t: "Lavender Horizon", a: "Velvet Mist", p: 38, icon: "spa" },
          ].map((q) => (
            <div key={q.t} className="bg-white rounded-2xl p-3 clay-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#f6e9ff] flex items-center justify-center">
                    <Icon name={q.icon} className="text-[20px]" />
                  </div>
                  <div className="min-w-0"><p className="font-display font-bold text-[12px] truncate">{q.t}</p><p className="text-[12px] truncate">{q.a}</p></div>
                </div>
                <span className="font-bold text-[12px]">{q.p}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#f2e2ff] p-0.5"><div className="h-full rounded-full bg-[#a6d7fe]" style={{ width: `${q.p}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="font-display font-bold text-[22px]">Downloaded Tunes <span className="text-[12px] bg-[#e9ddff] rounded-full px-2 py-0.5">3</span></p>
        </div>

        {[
          { t: "Velvet Blanket", a: "Cosy Pajama Band", icon: "bedtime" },
          { t: "Slumber Symphony", a: "Dream Puddle", icon: "music_note" },
        ].map((s) => (
          <div key={s.t} className="w-full bg-white rounded-2xl p-3 clay-card flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#f6e9ff] flex items-center justify-center">
                <Icon name={s.icon} className="text-[24px]" />
              </div>
              <div className="min-w-0"><p className="font-display font-bold truncate">{s.t}</p><p className="text-[12px] text-[#944652] truncate">{s.a}</p></div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="w-8 h-8 rounded-full bg-[#c9e6ff] flex items-center justify-center">
                <Icon name="check" className="text-[16px]" />
              </span>
              <button aria-label={`Play ${s.t}`} className="w-10 h-10 rounded-full bg-[#d5c4ff] clay-card flex items-center justify-center min-w-[44px]">
                <Icon name="play_arrow" fill className="text-[20px]" />
              </button>
            </div>
          </div>
        ))}

        <div className="w-full bg-[#eedbff]/40 rounded-2xl p-4 clay-card flex gap-3 items-start">
          <Icon name="lightbulb" className="text-[20px]" />
          <p className="text-[12px]">Tip: Long press any track to share over local offline peer drop!</p>
        </div>
      </main>
      <MiniPlayer />
      <BottomNav active="offline" />
    </div>
  );
}
