import Dexie, { type Table } from "dexie";

export interface SavedTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  icon: string;
  bg: string;
  blob: Blob;
  mime: string;
  size: number;
  quality: string;
  addedAt: number;
  playCount: number;
}

class PuffDB extends Dexie {
  tracks!: Table<SavedTrack, string>;
  constructor() {
    super("puff-db");
    this.version(1).stores({ tracks: "id, addedAt" });
  }
}

export const db = new PuffDB();

export async function listTracks(): Promise<SavedTrack[]> {
  return db.tracks.orderBy("addedAt").reverse().toArray();
}

export async function getTrack(id: string) {
  return db.tracks.get(id);
}

export async function removeTrack(id: string) {
  return db.tracks.delete(id);
}

export async function clearTracks() {
  return db.tracks.clear();
}

export async function stashSize(): Promise<number> {
  const all = await db.tracks.toArray();
  return all.reduce((n, t) => n + (t.size || 0), 0);
}
