"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlayer } from "../../lib/player-context";
import AppIcon from "./AppIcon";

export function Icon({ name, fill = false, className = "" }: { name: string; fill?: boolean; className?: string }) {
  return <span className={`material-symbols-outlined ${fill ? "fill" : ""} ${className}`}>{name}</span>;
}

export function MiniPlayer() {
  const { current, playing, toggle } = usePlayer();
  const [liked, setLiked] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const title = current?.title ?? "Nothing playing";
  const artist = current?.artist ?? "Import tunes to begin";
  const showArt = !!current?.artwork && !artFailed;
  useEffect(() => {
    setArtFailed(false);
  }, [current?.id]);
  return (
    <aside className="fixed inset-x-0 z-40 px-5 pointer-events-none" style={{ bottom: "4.75rem" }}>
      <div className="pointer-events-auto mx-auto max-w-[390px] h-[64px] t-card-95 rounded-full px-3 flex items-center justify-between clay-pill">
        <Link href="/player" className="flex items-center gap-3 min-w-0 flex-1" onClick={() => setArtFailed(false)}>
          {showArt ? (
            <img
              src={current.artwork as string}
              alt=""
              className="w-11 h-11 rounded-full object-cover clay-thumb shrink-0"
              onError={() => setArtFailed(true)}
            />
          ) : (
            <div className="w-11 h-11 rounded-full t-primary-ct clay-thumb flex items-center justify-center shrink-0">
              <Icon name="music_note" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-[14px] truncate">{title}</p>
            <p className="text-[11px] t-tertiary-text truncate font-bold">{artist}</p>
          </div>
          <span className="t-muted flex items-center" aria-hidden>
            <Icon name="expand_less" />
          </span>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setLiked(!liked)} aria-label="Favorite" className="w-11 h-11 flex items-center justify-center min-w-[44px] min-h-[44px] t-muted">
            <Icon name="favorite" fill={liked} />
          </button>
          <button onClick={toggle} aria-label="Play or Pause" className="w-11 h-11 rounded-full t-primary clay-button-active flex items-center justify-center min-w-[44px] min-h-[44px]">
            <Icon name={playing ? "pause" : "play_arrow"} fill />
          </button>
        </div>
      </div>
    </aside>
  );
}

const TABS = [
  { href: "/", label: "Home", icon: "home", id: "home" },
  { href: "/search", label: "Search", icon: "search", id: "search" },
  { href: "/library", label: "Library", icon: "local_library", id: "library" },
  { href: "/offline", label: "Offline", icon: "cloud_download", id: "offline" },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 px-5 pointer-events-none" style={{ paddingBottom: 0 }}>
      <div className="pointer-events-auto mx-auto max-w-[390px] h-16 t-card-90 rounded-full px-2 flex items-center justify-around clay-pill">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-full min-w-[56px] min-h-[48px] ${
              active === t.id ? "t-primary-ct clay-button-active font-bold" : "t-muted"
            }`}
          >
            <Icon name={t.icon} fill={active === t.id} className="text-[22px]" />
            <span className="font-display font-bold text-[10px]">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe t-bg">
      <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppIcon className="w-9 h-9 rounded-2xl clay-thumb" />
          <span className="font-display font-bold text-[22px]">Puff</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-[12px] t-muted">{title}</span>
        </div>
      </div>
    </header>
  );
}
