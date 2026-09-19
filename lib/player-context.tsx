"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { db } from "./db";
import { CATALOG, type CatalogTrack } from "./catalog";
import { loadSettings } from "./downloads";

interface PlayerState {
  current: CatalogTrack | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  objectUrl: string | null;
  offlineMode: boolean;
  play: (id: string) => Promise<void>;
  toggle: () => void;
  seek: (sec: number) => void;
  next: () => void;
  prev: () => void;
  setOfflineMode: (v: boolean) => void;
}

const Ctx = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePlayer outside provider");
  return p;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [current, setCurrent] = useState<CatalogTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [offlineMode, setOfflineModeState] = useState(false);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;
    try {
      setOfflineModeState(loadSettings().offlineMode);
    } catch {}
    const onTime = () => setCurrentTime(a.currentTime || 0);
    const onDur = () => setDuration(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", () => a.play().catch(() => {}));
        navigator.mediaSession.setActionHandler("pause", () => a.pause());
      } catch {}
    }
    // Sleep timer: 30 min fade-out stop
    try {
      const s = loadSettings();
      if (s.sleepOn) {
        if (sleepTimer.current) clearTimeout(sleepTimer.current);
        sleepTimer.current = setTimeout(() => a.pause(), 30 * 60 * 1000);
      }
    } catch {}
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
    };
  }, []);

  const setSrc = useCallback((url: string) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url.startsWith("blob:") ? url : null;
    setObjectUrl(url);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
    }
  }, []);

  const play = useCallback(
    async (id: string) => {
      const meta = CATALOG.find((t) => t.id === id);
      if (!meta) return;
      setCurrent(meta);
      // Prefer local blob when saved (offline-proof), else stream remote.
      const saved = await db.tracks.get(id).catch(() => undefined);
      const url = saved ? URL.createObjectURL(saved.blob) : meta.remoteUrl;
      setSrc(url);
      try {
        await audioRef.current?.play();
      } catch {}
      if (saved) {
        await db.tracks.update(id, { playCount: (saved.playCount || 0) + 1 }).catch(() => {});
      }
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: meta.title,
            artist: meta.artist,
            album: "Puff",
          });
        } catch {}
      }
    },
    [setSrc]
  );

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      if (!a.src && CATALOG[0]) {
        play(CATALOG[0].id);
        return;
      }
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [play]);

  const seek = useCallback((sec: number) => {
    const a = audioRef.current;
    if (a && isFinite(sec)) {
      a.currentTime = Math.max(0, Math.min(sec, a.duration || sec));
      setCurrentTime(a.currentTime);
    }
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!current) {
        play(CATALOG[0].id);
        return;
      }
      const i = CATALOG.findIndex((t) => t.id === current.id);
      const n = CATALOG[(i + dir + CATALOG.length) % CATALOG.length];
      play(n.id);
    },
    [current, play]
  );

  const setOfflineMode = useCallback((v: boolean) => {
    setOfflineModeState(v);
    try {
      const s = loadSettings();
      import("./downloads").then(({ storeSettings }) => storeSettings({ ...s, offlineMode: v }));
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      current,
      playing,
      currentTime,
      duration: duration || current?.durationSec || 0,
      objectUrl,
      offlineMode,
      play,
      toggle,
      seek,
      next: () => step(1),
      prev: () => step(-1),
      setOfflineMode,
    }),
    [current, playing, currentTime, duration, objectUrl, offlineMode, play, toggle, seek, step, setOfflineMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
