import type { SupabaseClient } from "@supabase/supabase-js";
import {
  T_ENTRIES,
  T_LIFE_MARKERS,
  T_QUOTES,
} from "@/lib/constants";

// Automated backup (TD-3): dump the tables that cannot be rebuilt from a git
// clone — the journal, the quote pool, the life markers — into one JSON
// object and write it to the private `verum-backups` Storage bucket.
//
// One object per calendar month, upserted, so a re-run (cron retry, manual
// invocation) refreshes that month's snapshot instead of piling up copies.
// Restore path: download the object, and re-insert; the shape matches the
// tables one-to-one.

export const BACKUP_BUCKET = "verum-backups";

export type BackupResult = {
  object: string;
  bytes: number;
  counts: { entries: number; quotes: number; life_markers: number };
};

export function backupObjectName(month: string): string {
  return `verum-backup-${month}.json`;
}

export async function runBackupToStorage(
  db: SupabaseClient,
  month: string
): Promise<BackupResult> {
  const [entries, quotes, markers] = await Promise.all([
    db.from(T_ENTRIES).select("*").order("day", { ascending: true }),
    db.from(T_QUOTES).select("*").order("id", { ascending: true }),
    db.from(T_LIFE_MARKERS).select("*").order("week_index", { ascending: true }),
  ]);

  for (const res of [entries, quotes, markers]) {
    if (res.error) throw res.error;
  }

  const payload = {
    app: "verum",
    schema_version: 1,
    exported_at: new Date().toISOString(),
    month,
    counts: {
      entries: entries.data?.length ?? 0,
      quotes: quotes.data?.length ?? 0,
      life_markers: markers.data?.length ?? 0,
    },
    entries: entries.data ?? [],
    quotes: quotes.data ?? [],
    life_markers: markers.data ?? [],
  };

  const body = JSON.stringify(payload, null, 2);
  const object = backupObjectName(month);

  const { error } = await db.storage
    .from(BACKUP_BUCKET)
    .upload(object, body, {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;

  return {
    object,
    bytes: Buffer.byteLength(body, "utf8"),
    counts: payload.counts,
  };
}
