// Offline capture queue. When a save can't reach the network, the entry
// waits here (device-local) and syncs on reconnect. Keyed by day so repeated
// offline edits of the same day collapse to the latest text — matching the
// server's one-entry-per-day upsert.

export type PendingEntry = { day: string; text: string; queuedAt: string };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "verum-pending-entries";

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // storage blocked (private mode etc.) — queueing unavailable
  }
}

function read(storage: StorageLike): Record<string, PendingEntry> {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PendingEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(storage: StorageLike, map: Record<string, PendingEntry>) {
  try {
    if (Object.keys(map).length === 0) storage.removeItem(KEY);
    else storage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* best effort — a full/blocked store loses queueing, not the app */
  }
}

export function queuePendingEntry(
  day: string,
  text: string,
  storage: StorageLike | null = defaultStorage()
): boolean {
  if (!storage) return false;
  const map = read(storage);
  map[day] = { day, text, queuedAt: new Date().toISOString() };
  write(storage, map);
  return true;
}

// Oldest first, so a multi-day offline stretch replays in the order it was lived.
export function listPendingEntries(
  storage: StorageLike | null = defaultStorage()
): PendingEntry[] {
  if (!storage) return [];
  return Object.values(read(storage)).sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0
  );
}

export function clearPendingEntry(
  day: string,
  storage: StorageLike | null = defaultStorage()
): void {
  if (!storage) return;
  const map = read(storage);
  delete map[day];
  write(storage, map);
}

export function hasPendingEntries(
  storage: StorageLike | null = defaultStorage()
): boolean {
  return listPendingEntries(storage).length > 0;
}
