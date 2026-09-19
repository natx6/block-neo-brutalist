"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BottomNav, MiniPlayer, Icon } from "./components/Nav";
import { recentTracks, type SavedTrack } from "../lib/db";
import { loadSettings, saveFileTracks, storeSettings } from "../lib/downloads";
import { usePlayer } from "../lib/player-context";

const MOODS = [
  { title: "Happy", sub: "Sun-kissed beats", bg: "bg-[#FFF2B2]", dot: "bg-[#FFE580]", text: "text-[#574400]", subText: "text-[#7A6000]", icon: "sunny" },
  { title: "Cozy", sub: "Warm hot cocoa", bg: "bg-[#FFD6B8]", dot: "bg-[#FFBE94]", text: "text-[#5A2B0F]", subText: "text-[#7B3F1B]", icon: "coffee" },
  { title: "Focus", sub: "Gentle flow state", bg: "bg-[#C7F5DC]", dot: "bg-[#A8ECC4]", text: "text-[#144D32]", subText: "text-[#1E6B47]", icon: "spa" },
  { title: "Dreamy", sub: "Bedtime melodies", bg: "bg-[#E2D4FF]", dot: "bg-[#CFBCFA]", text: "text-[#352561]", subText: "text-[#4A387E]", icon: "bedtime" },
];

export default function Home() {
  const [sleepOn, setSleepOn] = useState(true);
  const [recent, setRecent] = useState<SavedTrack[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { current, playing, play } = usePlayer();

  const refresh = useCallback(async () => {
    try {
      setRecent(await recentTracks(4));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      setSleepOn(loadSettings().sleepOn);
    } catch {}
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const toggleSleep = () => {
    const next = !sleepOn;
    setSleepOn(next);
    try {
      const s = loadSettings();
      storeSettings({ ...s, sleepOn: next });
    } catch {}
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const count = files.length;
    setImportStatus("Importing...");
    try {
      await saveFileTracks(files, loadSettings().quality);
      setImportStatus(`Saved ${count} song(s)`);
      await refresh();
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Import failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="t-bg min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe t-bg-80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl t-primary-ct clay-thumb flex items-center justify-center">
              <Icon name="cloud" fill />
            </div>
            <span className="font-display font-bold text-[22px]">Puff</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" aria-label="Settings" className="w-11 h-11 rounded-full t-container clay-card flex items-center justify-center t-primary-text min-w-[44px]">
              <Icon name="settings" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-[180px]">
        <div className="px-5 pt-3">
          <div>
            <p className="font-display font-bold text-[18px]">Good afternoon</p>
            <p className="text-[12px] t-muted font-medium">Sweet Pea&apos;s Sanctuary</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="px-5 flex items-center justify-between mb-2">
            <p className="font-display font-bold text-[22px]">Recently Played</p>
            <Link href="/library" className="font-display font-bold text-[12px] t-primary-text min-h-[44px] flex items-center">See all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5">
              <div className="w-full t-card p-6 rounded-2xl clay-card flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full t-primary-ct clay-thumb flex items-center justify-center mb-2">
                  <Icon name="cloud" fill className="text-[28px]" />
                </div>
                <p className="font-display font-bold text-[18px]">Your stash is empty</p>
                <p className="text-[13px] t-muted mt-1">Import audio from your device and it will live here.</p>
                <Link href="/search" className="mt-3 h-11 px-6 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center min-h-[44px]">
                  Add music
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto px-5 pb-3 pt-1 no-scrollbar">
              {recent.map((t) => {
                const isCurrent = current?.id === t.id && playing;
                return (
                  <button key={t.id} onClick={() => play(t.id)} className="flex flex-col gap-2 shrink-0 w-[140px] text-left active:scale-95 transition-transform">
                    <div className="relative w-[140px] h-[140px] rounded-[28px] p-2 clay-card flex items-center justify-center" style={{ background: t.bg }}>
                      <div className="w-full h-full rounded-[20px] bg-white/70 flex items-center justify-center text-[#4c3f70]">
                        <Icon name={t.icon} fill className="text-[56px]" />
                      </div>
                      <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full t-primary clay-thumb flex items-center justify-center">
                        <Icon name={isCurrent ? "pause" : "play_arrow"} fill className="text-[20px]" />
                      </div>
                    </div>
                    <div className="px-1">
                      <p className="font-display font-bold text-[14px] truncate">{t.title}</p>
                      <p className="text-[12px] t-muted truncate">{t.artist}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 mt-4">
          <div className="rounded-2xl bg-gradient-to-br from-[var(--container)] to-[var(--variant)] p-4 clay-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full t-primary-ct clay-thumb flex items-center justify-center shrink-0">
                <Icon name="library_music" fill />
              </div>
              <div>
                <h3 className="font-display font-bold text-[18px]">Add music</h3>
                <p className="text-[12px] t-muted">Import files or paste a link to grow your stash.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-12 rounded-full t-primary font-display font-bold text-[14px] clay-button-active flex items-center justify-center gap-1.5 min-h-[48px]"
              >
                <Icon name="upload" className="text-[20px]" />
                From device
              </button>
              <Link href="/search" className="h-12 rounded-full t-card font-display font-bold text-[14px] clay-card flex items-center justify-center gap-1.5 min-h-[48px]">
                <Icon name="link" className="text-[20px]" />
                Paste a link
              </Link>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {importStatus && (
              <p className="text-[12px] font-bold t-muted mt-2">{importStatus}</p>
            )}
          </div>
        </div>

        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-bold text-[22px]">Moods &amp; Vibes</p>
            <span className="text-[11px] t-muted font-medium">Pick a feeling</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map((m) => (
              <button key={m.title} className={`${m.bg} h-28 rounded-2xl p-3.5 clay-card flex flex-col justify-between text-left active:scale-95 transition-transform min-h-[112px]`}>
                <div className="flex items-start justify-between">
                  <span className={`w-10 h-10 rounded-full ${m.dot} flex items-center justify-center text-[#231534]`}>
                    <Icon name={m.icon} fill />
                  </span>
                  <Icon name="north_east" className="text-[18px] opacity-50" />
                </div>
                <div>
                  <p className={`font-display font-bold text-[18px] ${m.text}`}>{m.title}</p>
                  <p className={`text-[11px] font-bold ${m.subText}`}>{m.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 mt-4">
          <div className="p-4 rounded-2xl t-card clay-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full t-secondary-ct flex items-center justify-center">
                <Icon name="bedtime" fill />
              </div>
              <div>
                <p className="font-display font-bold text-[14px]">Sleep Timer</p>
                <p className="text-[12px] t-muted">Auto fade in 30 mins</p>
              </div>
            </div>
            <button
              onClick={toggleSleep}
              className={`w-12 h-7 rounded-full p-0.5 relative min-w-[48px] ${sleepOn ? "t-primary-ct" : "t-variant"}`}
              aria-checked={sleepOn}
              role="switch"
            >
              <div className={`w-6 h-6 rounded-full bg-white clay-thumb transition-transform ${sleepOn ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </main>

      <MiniPlayer />
      <BottomNav active="home" />
    </div>
  );
}
