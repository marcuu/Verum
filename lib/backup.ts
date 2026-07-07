import type { SupabaseClient } from "@supabase/supabase-js";
import { Encrypter } from "age-encryption";
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
//
// Encryption (assume the bucket leaks): when BACKUP_PUBLIC_KEY holds an age
// recipient ("age1…"), the snapshot is sealed to that key before upload and
// stored as .json.age — the server and bucket never hold a key that can read
// it back; the matching identity lives offline with the owner. A missing key
// means plaintext (zero-config default, documented); a *malformed* key is a
// hard failure, never a silent plaintext fallback. Restore path: standard
// age CLI (`age -d -i key.txt verum-backup-YYYY-MM.json.age`).

export const BACKUP_BUCKET = "verum-backups";

export type BackupResult = {
  object: string;
  bytes: number;
  encrypted: boolean;
  counts: { entries: number; quotes: number; life_markers: number };
};

export function backupObjectName(month: string, encrypted: boolean): string {
  return `verum-backup-${month}.json${encrypted ? ".age" : ""}`;
}

async function sealIfConfigured(
  body: string
): Promise<{ data: string | Uint8Array; encrypted: boolean }> {
  const recipient = process.env.BACKUP_PUBLIC_KEY;
  if (!recipient) return { data: body, encrypted: false };

  const encrypter = new Encrypter();
  encrypter.addRecipient(recipient); // throws on a malformed recipient
  return { data: await encrypter.encrypt(body), encrypted: true };
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
  const { data, encrypted } = await sealIfConfigured(body);
  const object = backupObjectName(month, encrypted);

  const { error } = await db.storage
    .from(BACKUP_BUCKET)
    .upload(object, typeof data === "string" ? data : Buffer.from(data), {
      contentType: encrypted ? "application/octet-stream" : "application/json",
      upsert: true,
    });
  if (error) throw error;

  // First encrypted run after a plaintext era: don't leave this month's
  // plaintext object sitting next to the ciphertext. Best-effort; earlier
  // months are a one-time manual sweep (see README → Operations).
  if (encrypted) {
    await db.storage
      .from(BACKUP_BUCKET)
      .remove([backupObjectName(month, false)])
      .catch(() => {});
  }

  return {
    object,
    bytes: typeof data === "string" ? Buffer.byteLength(data, "utf8") : data.length,
    encrypted,
    counts: payload.counts,
  };
}
