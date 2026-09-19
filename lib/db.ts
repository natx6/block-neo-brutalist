import Dexie, { type Table } from "dexie";

export interface SavedTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  icon: string;
  bg: string;
  artwork?: string | null;
  source?: string | null;
  sourceId?: string | null;
  blob: Blob;
  mime: string;
  size: number;
  quality: string;
  addedAt: number;
  playCount: number;
  lastPlayedAt?: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

class PuffDB extends Dexie {
  tracks!: Table<SavedTrack, string>;
  playlists!: Table<Playlist, string>;
  constructor() {
    super("puff-db");
    this.version(1).stores({ tracks: "id, addedAt" });
    this.version(2).stores({ tracks: "id, addedAt", playlists: "id, createdAt" });
  }
}

export const db = new PuffDB();

export async function listTracks(): Promise<SavedTrack[]> {
  return db.tracks.orderBy("addedAt").reverse().toArray();
}

export async function recentTracks(limit = 4): Promise<SavedTrack[]> {
  const all = await db.tracks.toArray();
  return all
    .sort((a, b) => (b.lastPlayedAt || b.addedAt) - (a.lastPlayedAt || a.addedAt))
    .slice(0, limit);
}

export async function getTrack(id: string) {
  return db.tracks.get(id);
}

export async function removeTrack(id: string) {
  await db.tracks.delete(id);
  // prune from playlists
  const pls = await db.playlists.toArray();
  for (const p of pls) {
    if (p.trackIds.includes(id)) {
      await db.playlists.update(p.id, { trackIds: p.trackIds.filter((t) => t !== id) });
    }
  }
}

export async function clearTracks() {
  await db.tracks.clear();
}

export async function stashSize(): Promise<number> {
  const all = await db.tracks.toArray();
  return all.reduce((n, t) => n + (t.size || 0), 0);
}

export async function listPlaylists(): Promise<Playlist[]> {
  try {
    return await db.playlists.orderBy("createdAt").reverse().toArray();
  } catch {
    return [];
  }
}
