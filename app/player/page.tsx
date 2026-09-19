"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "../components/Nav";
import { usePlayer } from "../../lib/player-context";
import { CATALOG, fmtTime } from "../../lib/catalog";
import { saveCatalogTrack } from "../../lib/downloads";

export default function PlayerPage() {
  const { current, playing, currentTime, duration, toggle, seek, next, prev } = usePlayer();
  const [liked, setLiked] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const title = current?.title ?? "Cotton Candy Clouds";
  const artist = current?.artist ?? "Lofi Pillow";
  const trackId = current?.id ?? CATALOG[0].id;
  const pct = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seek(frac * duration);
  };

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await saveCatalogTrack(trackId);
      setSaved(true);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title, text: `${title} by ${artist}`, url };
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share(data);
        return;
      }
      throw new Error("no share");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    }
  };

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
            <h2 className="font-display font-bold text-[22px] truncate">{title}</h2>
            <p className="font-bold text-[14px] text-[#49454e] truncate">{artist}</p>
          </div>
          <button onClick={() => setLiked(!liked)} aria-label="Favorite" className="w-12 h-12 rounded-full bg-white clay-card flex items-center justify-center min-w-[48px] min-h-[48px]">
            <Icon name="favorite" fill={liked} className="text-[28px]" />
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-8">
          <div className="relative w-full h-8 flex items-center cursor-pointer" onClick={handleSeek}>
            <div className="w-full h-3 rounded-full bg-[#f2e2ff] shadow-[inset_2px_2px_4px_rgba(74,59,92,0.14)] p-[2px]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#a6d7fe] via-[#d5c4ff] to-[#64568a]" style={{ width: `${pct}%` }} />
            </div>
            <div className="absolute w-6 h-6 rounded-full bg-white clay-thumb flex items-center justify-center" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
              <div className="w-2.5 h-2.5 rounded-full bg-[#64568a]" />
            </div>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="font-display font-bold text-[11px]">{fmtTime(currentTime)}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#f6e9ff] text-[11px] font-bold">FLAC 48kHz</span>
            <span className="font-display font-bold text-[11px]">{fmtTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 mb-8">
          <button aria-label="Shuffle" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px] min-h-[44px]">
            <Icon name="shuffle" />
          </button>
          <button onClick={prev} aria-label="Previous" className="w-[52px] h-[52px] rounded-full bg-[#e9ddff] clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
            <Icon name="skip_previous" fill />
          </button>
          <button onClick={toggle} aria-label="Play or pause" className="w-[72px] h-[72px] rounded-full bg-[#ffbbc2] clay-card flex items-center justify-center min-w-[72px] min-h-[72px] active:scale-95">
            <Icon name={playing ? "pause" : "play_arrow"} fill className="text-[36px]" />
          </button>
          <button onClick={next} aria-label="Next" className="w-[52px] h-[52px] rounded-full bg-[#c9e6ff] clay-card flex items-center justify-center min-w-[52px] min-h-[52px]">
            <Icon name="skip_next" fill />
          </button>
          <button onClick={() => setRepeat(!repeat)} aria-label="Repeat" className={`w-11 h-11 rounded-full clay-card flex items-center justify-center min-w-[44px] min-h-[44px] ${repeat ? "bg-[#d5c4ff]" : "bg-[#f6e9ff]"}`}>
            <Icon name="repeat_one" />
          </button>
        </div>

        <div className="w-full bg-[#f6e9ff]/60 rounded-[28px] p-3 clay-card flex items-center justify-around">
          <button onClick={handleSave} aria-label="Save track" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name={saved ? "check" : "download"} className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">{saving ? "Saving" : "Saved"}</span>
          </button>
          <button aria-label="Add to playlist" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name="add" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">Add</span>
          </button>
          <button onClick={handleShare} aria-label="Share track" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name="share" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">Share</span>
          </button>
          <Link href="/queue" className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center">
            <div className="w-11 h-11 rounded-full bg-white clay-thumb flex items-center justify-center">
              <Icon name="queue_music" className="text-[20px]" />
            </div>
            <span className="font-display font-bold text-[11px]">Queue</span>
          </Link>
        </div>

        <Link href="/" className="block text-center mt-6 font-display font-bold text-[12px] text-[#64568a]">Back Home</Link>
      </main>
    </div>
  );
}
