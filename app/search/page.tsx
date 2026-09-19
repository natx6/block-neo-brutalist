"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomNav, Icon, MiniPlayer, TopBar } from "../components/Nav";
import { CATALOG, fmtTime } from "../../lib/catalog";
import { db } from "../../lib/db";
import { loadSettings, saveCatalogTrack } from "../../lib/downloads";
import { usePlayer } from "../../lib/player-context";

const FILTERS = ["All", "Sleepy", "Instrumental", "Acoustic", "Ambient"];

export default function SearchPage() {
  const { play } = usePlayer();
  const [query, setQuery] = useState("Lo-Fi Chill & Sleep");
  const [filter, setFilter] = useState(0);
  const [loading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, number>>({});

  const TRACKS = CATALOG.slice(0, 4);

  const refreshSaved = useCallback(async () => {
    try {
      const all = await db.tracks.toArray();
      setSavedIds(new Set(all.map((t) => t.id)));
    } catch {}
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  const handleDownload = async (id: string) => {
    if (savedIds.has(id) || progress[id] !== undefined) return;
    setProgress((p) => ({ ...p, [id]: 0 }));
    try {
      const quality = loadSettings().quality;
      await saveCatalogTrack(id, quality, (pct) => {
        setProgress((p) => ({ ...p, [id]: pct }));
      });
      await refreshSaved();
    } catch {
    } finally {
      setProgress((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  };

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <TopBar title="Search" />
      <main className="flex-1 pt-16 pb-[180px] px-5 flex flex-col gap-4">
        <div className="pt-3">
          <div className="flex items-center w-full h-14 bg-white rounded-full px-4 clay-card">
            <span className="text-[#64568a] mr-2 flex items-center">
              <Icon name="search" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search tracks"
              className="flex-1 bg-transparent font-display font-semibold text-[16px] focus:outline-none min-w-0"
            />
            <button onClick={() => setQuery("")} aria-label="Clear search" className="w-10 h-10 rounded-full bg-[#f6e9ff] clay-thumb flex items-center justify-center min-w-[44px]">
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-5 px-5">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              onClick={() => setFilter(i)}
              className={`shrink-0 h-11 px-5 rounded-full font-display font-bold text-[14px] min-h-[44px] ${
                filter === i ? "bg-[#d5c4ff] clay-button-active" : "bg-white clay-card text-[#49454e]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[18px]">Top Matches</span>
            <span className="font-display font-bold text-[12px] bg-[#e9ddff] px-2.5 py-0.5 rounded-full clay-thumb">4 tracks</span>
          </div>
          <span className="text-[11px] font-bold text-[#49454e]">Tap to play</span>
        </div>

        <div className="flex flex-col gap-3">
          {TRACKS.map((t) => {
            const isSaved = savedIds.has(t.id);
            const pct = progress[t.id];
            const isDownloading = pct !== undefined;
            return (
              <div key={t.id} onClick={() => play(t.id)} className="w-full bg-white p-3 rounded-2xl clay-card flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-2xl clay-thumb flex items-center justify-center shrink-0" style={{ background: t.bg }}>
                    <Icon name={t.icon} className="text-[28px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-[16px] truncate">{t.title}</p>
                    <p className="text-[12px] text-[#49454e] truncate">{t.artist} • {fmtTime(t.durationSec)}</p>
                  </div>
                </div>
                {isSaved ? (
                  <button aria-label={`Saved ${t.title}`} onClick={(e) => e.stopPropagation()} className="w-11 h-11 rounded-full bg-[#c9e6ff] clay-thumb flex items-center justify-center font-bold min-w-[44px] min-h-[44px]">
                    <Icon name="check" />
                  </button>
                ) : isDownloading ? (
                  <div className="relative w-11 h-11 rounded-full bg-[#f6e9ff] clay-thumb flex items-center justify-center min-w-[44px] min-h-[44px]">
                    <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="17" stroke="#eedbff" strokeWidth="4" fill="none" />
                      <circle
                        cx="22"
                        cy="22"
                        r="17"
                        stroke="#306385"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray="106.8"
                        strokeDashoffset={106.8 * (1 - (pct || 0) / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold">{pct}%</span>
                  </div>
                ) : (
                  <button
                    aria-label={`Download ${t.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(t.id);
                    }}
                    className="w-11 h-11 rounded-full bg-[#a6d7fe] clay-thumb flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-90"
                  >
                    <Icon name="download" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="w-full bg-[#fbf0ff] p-6 rounded-2xl clay-card flex flex-col items-center text-center">
            <div className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[#a6d7fe] clay-thumb animate-bounce" />
              <div className="w-7 h-7 rounded-full bg-[#d5c4ff] clay-thumb animate-bounce" style={{ animationDelay: "180ms" }} />
              <div className="w-5 h-5 rounded-full bg-[#ffbbc2] clay-thumb animate-bounce" style={{ animationDelay: "360ms" }} />
            </div>
            <p className="font-display font-bold">Searching the clouds...</p>
          </div>
        ) : (
          <div className="w-full bg-white p-6 rounded-2xl clay-card flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2 text-[#64568a]">
              <Icon name="cloud" className="text-[48px]" />
              <Icon name="bedtime" className="text-[48px]" />
            </div>
            <h3 className="font-display font-bold text-[22px]">Nothing here yet</h3>
            <p className="text-[14px] text-[#49454e] max-w-[280px]">Try searching for daydream sounds or lo-fi beats!</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <button className="px-3.5 py-2 rounded-full bg-[#f6e9ff] font-display font-bold text-[12px] clay-thumb min-h-[44px] flex items-center gap-1.5">
                <Icon name="cloud" className="text-[18px]" /> Rain on Canvas
              </button>
              <button className="px-3.5 py-2 rounded-full bg-[#f6e9ff] font-display font-bold text-[12px] clay-thumb min-h-[44px] flex items-center gap-1.5">
                <Icon name="bedtime" className="text-[18px]" /> Midnight Cocoa
              </button>
            </div>
          </div>
        )}
      </main>
      <MiniPlayer />
      <BottomNav active="search" />
    </div>
  );
}
