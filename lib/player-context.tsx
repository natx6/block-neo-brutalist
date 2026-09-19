"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { db, type SavedTrack } from "./db";
import { loadSettings } from "./downloads";

export interface NowPlaying {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  icon: string;
  bg: string;
  artwork?: string | null;
}

interface PlayerState {
  current: NowPlaying | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  offlineMode: boolean;
  play: (id: string) => Promise<void>;
  playList: (ids: string[], startIdx?: number) => Promise<void>;
  /** Play a remote URL without saving (search preview). */
  preview: (meta: NowPlaying, url: string) => Promise<void>;
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

async function orderedIds(): Promise<string[]> {
  try {
    const all = await db.tracks.orderBy("addedAt").toArray();
    return all.map((t) => t.id);
  } catch {
    return [];
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const [current, setCurrent] = useState<NowPlaying | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const playId = useCallback(async (id: string) => {
    const saved: SavedTrack | undefined = await db.tracks.get(id).catch(() => undefined);
    if (!saved) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(saved.blob);
    urlRef.current = url;
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
    }
    setCurrent({
      id: saved.id,
      title: saved.title,
      artist: saved.artist,
      durationSec: saved.durationSec,
      icon: saved.icon,
      bg: saved.bg,
      artwork: saved.artwork ?? null,
    });
    setDuration(saved.durationSec || 0);
    try {
      await audioRef.current?.play();
    } catch {}
    await db.tracks.update(id, { playCount: (saved.playCount || 0) + 1, lastPlayedAt: Date.now() }).catch(() => {});
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: saved.title,
          artist: saved.artist,
          album: "Puff",
        });
      } catch {}
    }
  }, []);

  const play = useCallback(
    async (id: string) => {
      queueRef.current = await orderedIds();
      await playId(id);
    },
    [playId]
  );

  const playList = useCallback(
    async (ids: string[], startIdx = 0) => {
      if (!ids.length) return;
      queueRef.current = ids;
      await playId(ids[Math.max(0, Math.min(startIdx, ids.length - 1))]);
    },
    [playId]
  );

  const preview = useCallback(async (meta: NowPlaying, url: string) => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setCurrent(meta);
    setDuration(meta.durationSec || 0);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
    }
    try {
      await audioRef.current?.play();
    } catch {}
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: meta.title,
          artist: meta.artist,
          album: "Puff",
        });
      } catch {}
    }
  }, []);

  const toggle = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      if (!a.src) {
        const ids = queueRef.current.length ? queueRef.current : await orderedIds();
        if (!ids.length) return;
        queueRef.current = ids;
        await playId(ids[ids.length - 1]);
        return;
      }
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [playId]);

  const seek = useCallback((sec: number) => {
    const a = audioRef.current;
    if (a && isFinite(sec)) {
      a.currentTime = Math.max(0, Math.min(sec, a.duration || sec));
      setCurrentTime(a.currentTime);
    }
  }, []);

  const step = useCallback(
    async (dir: 1 | -1) => {
      const ids = queueRef.current.length ? queueRef.current : await orderedIds();
      if (!ids.length) return;
      queueRef.current = ids;
      if (!current) {
        await playId(ids[0]);
        return;
      }
      const i = ids.indexOf(current.id);
      const n = ids[(i < 0 ? 0 : i + dir + ids.length) % ids.length];
      await playId(n);
    },
    [current, playId]
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
      offlineMode,
      play,
      playList,
      preview,
      toggle,
      seek,
      next: () => step(1),
      prev: () => step(-1),
      setOfflineMode,
    }),
    [current, playing, currentTime, duration, offlineMode, play, playList, preview, toggle, seek, step, setOfflineMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
