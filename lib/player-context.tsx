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
  album?: string;
  year?: string;
  source?: "stash" | "audius" | "saavn";
  sourceId?: string;
  streamUrl?: string | null;
}

export type RepeatMode = "off" | "all" | "one";

export interface SessionQueueItem {
  meta: NowPlaying;
  url: string;
}

interface PlayerState {
  current: NowPlaying | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  offlineMode: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  upNext: NowPlaying[];
  play: (id: string) => Promise<void>;
  playList: (ids: string[], startIdx?: number) => Promise<void>;
  /** Play a remote URL without saving (search preview). */
  preview: (meta: NowPlaying, url: string, queue?: SessionQueueItem[]) => Promise<void>;
  toggle: () => void;
  seek: (sec: number) => void;
  next: () => void;
  prev: () => void;
  setOfflineMode: (v: boolean) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  saveCurrent: (quality?: string, onProgress?: (pct: number) => void) => Promise<string>;
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

function savedToNowPlaying(t: SavedTrack): NowPlaying {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    durationSec: t.durationSec,
    icon: t.icon,
    bg: t.bg,
    artwork: t.artwork ?? null,
    source: t.source === "audius" || t.source === "saavn" ? t.source : "stash",
    sourceId: t.sourceId ?? undefined,
    streamUrl: null,
  };
}

function setMediaMeta(title: string, artist: string) {
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: "Puff",
      });
    } catch {}
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const sessionRef = useRef<SessionQueueItem[]>([]);
  const sessionIdxRef = useRef(0);
  const [current, setCurrent] = useState<NowPlaying | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [offlineMode, setOfflineModeState] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [upNext, setUpNext] = useState<NowPlaying[]>([]);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs mirroring state for use inside stable callbacks / event listeners.
  const currentRef = useRef<NowPlaying | null>(null);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("off");
  const stepRef = useRef<(dir: 1 | -1) => Promise<void>>(async () => {});
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);
  useEffect(() => {
    repeatRef.current = repeatMode;
  }, [repeatMode]);

  const playSessionIndex = useCallback(async (idx: number) => {
    const sess = sessionRef.current;
    if (!sess.length) return;
    const safe = Math.max(0, Math.min(idx, sess.length - 1));
    sessionIdxRef.current = safe;
    const item = sess[safe];
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setCurrent({ ...item.meta, streamUrl: item.url });
    setDuration(item.meta.durationSec || 0);
    if (audioRef.current) {
      audioRef.current.src = item.url;
      audioRef.current.currentTime = 0;
    }
    try {
      await audioRef.current?.play();
    } catch {}
    setUpNext(sess.slice(safe + 1).map((s) => ({ ...s.meta, streamUrl: s.url })));
    setMediaMeta(item.meta.title, item.meta.artist);
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
      source: saved.source === "audius" || saved.source === "saavn" ? saved.source : "stash",
      sourceId: saved.sourceId ?? undefined,
      streamUrl: null,
    });
    setDuration(saved.durationSec || 0);
    try {
      await audioRef.current?.play();
    } catch {}
    await db.tracks.update(id, { playCount: (saved.playCount || 0) + 1, lastPlayedAt: Date.now() }).catch(() => {});
    setMediaMeta(saved.title, saved.artist);
    // upNext = saved metas after current within queueRef.
    try {
      const q = queueRef.current;
      const at = q.indexOf(id);
      if (at >= 0) {
        const after = q.slice(at + 1);
        if (!after.length) {
          setUpNext([]);
        } else {
          const tracks = await db.tracks.bulkGet(after).catch(() => []);
          setUpNext((tracks.filter(Boolean) as SavedTrack[]).map(savedToNowPlaying));
        }
      }
    } catch {}
  }, []);

  const step = useCallback(
    async (dir: 1 | -1) => {
      const cur = currentRef.current;
      const sess = sessionRef.current;
      if (cur && cur.source !== "stash" && sess.length > 1) {
        let ni: number;
        if (shuffleRef.current) {
          ni = Math.floor(Math.random() * sess.length);
          if (sess.length > 1 && ni === sessionIdxRef.current) ni = (ni + 1) % sess.length;
        } else {
          ni = (sessionIdxRef.current + dir + sess.length) % sess.length;
        }
        await playSessionIndex(ni);
        return;
      }
      const ids = queueRef.current.length ? queueRef.current : await orderedIds();
      if (!ids.length) return;
      queueRef.current = ids;
      if (!cur) {
        await playId(ids[0]);
        return;
      }
      let n: string;
      if (shuffleRef.current && ids.length > 1) {
        const others = ids.filter((x) => x !== cur.id);
        n = others[Math.floor(Math.random() * others.length)];
      } else {
        const i = ids.indexOf(cur.id);
        n = ids[(i < 0 ? 0 : i + dir + ids.length) % ids.length];
      }
      await playId(n);
    },
    [playId, playSessionIndex]
  );

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

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
    const onEnd = () => {
      (async () => {
        try {
          const cur = currentRef.current;
          const rep = repeatRef.current;
          if (rep === "one" && cur) {
            try {
              a.currentTime = 0;
              await a.play();
            } catch {}
            return;
          }
          if (rep === "off") {
            const sess = sessionRef.current;
            if (cur && cur.source !== "stash" && sess.length > 1) {
              // At end of session (non-shuffle): stop instead of wrapping.
              if (!shuffleRef.current && sessionIdxRef.current >= sess.length - 1) {
                setPlaying(false);
                try {
                  a.pause();
                } catch {}
                return;
              }
            } else {
              const ids = queueRef.current.length ? queueRef.current : await orderedIds();
              if (!ids.length) {
                setPlaying(false);
                return;
              }
              queueRef.current = ids;
              if (cur) {
                const i = ids.indexOf(cur.id);
                // Shuffle never deterministically "ends"; otherwise stop at last item.
                if (!shuffleRef.current && i >= 0 && i === ids.length - 1) {
                  setPlaying(false);
                  try {
                    a.pause();
                  } catch {}
                  return;
                }
              }
            }
          }
          await stepRef.current(1);
        } catch {
          setPlaying(false);
        }
      })();
    };
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

  const preview = useCallback(
    async (meta: NowPlaying, url: string, queue?: SessionQueueItem[]) => {
      const items = queue ?? [{ meta, url }];
      sessionRef.current = items;
      let idx = items.findIndex((s) => s.meta.id === meta.id);
      if (idx < 0) idx = 0;
      sessionIdxRef.current = idx;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setCurrent({ ...meta, streamUrl: url });
      setDuration(meta.durationSec || 0);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.currentTime = 0;
      }
      try {
        await audioRef.current?.play();
      } catch {}
      setUpNext(items.slice(idx + 1).map((s) => ({ ...s.meta, streamUrl: s.url })));
      setMediaMeta(meta.title, meta.artist);
    },
    []
  );

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

  const setOfflineMode = useCallback((v: boolean) => {
    setOfflineModeState(v);
    try {
      const s = loadSettings();
      import("./downloads").then(({ storeSettings }) => storeSettings({ ...s, offlineMode: v }));
    } catch {}
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const saveCurrent = useCallback(
    async (quality?: string, onProgress?: (pct: number) => void): Promise<string> => {
      const cur = currentRef.current;
      if (!cur) throw new Error("nothing playing");
      const src = cur.source ?? "stash";
      if (src === "stash") return cur.id;
      const q = quality ?? (() => {
        try {
          return loadSettings().quality;
        } catch {
          return "Good";
        }
      })();
      if (src === "audius") {
        if (!cur.sourceId) throw new Error("missing audius sourceId");
        const { saveAudiusTrack } = await import("./downloads");
        const rec = await saveAudiusTrack(
          {
            sourceId: cur.sourceId,
            title: cur.title,
            artist: cur.artist,
            durationSec: cur.durationSec,
            artwork: cur.artwork ?? null,
          },
          q,
          onProgress
        );
        return rec.id;
      }
      if (src === "saavn") {
        if (!cur.sourceId) throw new Error("missing saavn sourceId");
        const { saveSaavnTrack } = await import("./downloads");
        const rec = await saveSaavnTrack(
          {
            id: cur.sourceId,
            title: cur.title,
            artist: cur.artist,
            album: cur.album ?? "",
            durationSec: cur.durationSec,
            year: cur.year ?? "",
            artwork: cur.artwork ?? null,
            url: cur.streamUrl ?? "",
          },
          q,
          onProgress
        );
        return rec.id;
      }
      throw new Error(`unknown source: ${src}`);
    },
    []
  );

  const value = useMemo(
    () => ({
      current,
      playing,
      currentTime,
      duration: duration || current?.durationSec || 0,
      offlineMode,
      shuffle,
      repeatMode,
      upNext,
      play,
      playList,
      preview,
      toggle,
      seek,
      next: () => step(1),
      prev: () => step(-1),
      setOfflineMode,
      toggleShuffle,
      cycleRepeat,
      saveCurrent,
    }),
    [current, playing, currentTime, duration, offlineMode, shuffle, repeatMode, upNext, play, playList, preview, toggle, seek, step, setOfflineMode, toggleShuffle, cycleRepeat, saveCurrent]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
