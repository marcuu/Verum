// Backup encryption (privacy plan item 2): real age crypto, mocked bucket.
// The properties under test are the security-relevant ones — ciphertext is
// not plaintext, it round-trips with the offline identity, a missing key
// stays plaintext, and a MALFORMED key hard-fails instead of silently
// falling back to plaintext.

import { describe, it, expect, beforeEach } from "vitest";
import { Decrypter, generateIdentity, identityToRecipient } from "age-encryption";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runBackupToStorage } from "@/lib/backup";

type Uploaded = {
  object: string;
  body: string | Buffer;
  contentType?: string;
};

const store: { uploads: Uploaded[]; removed: string[][] } = {
  uploads: [],
  removed: [],
};

const rows = {
  verum_entries: [
    { id: 1, day: "2026-07-01", text: "a quiet day" },
    { id: 2, day: "2026-07-02", text: "rain, then not" },
  ],
  verum_quotes: [{ id: 1, text: "q", author: "a", score: 3 }],
  verum_life_markers: [{ id: 1, week_index: 4, label: "moved", accent: "#aabbcc" }],
};

function fakeDb(): SupabaseClient {
  return {
    from: (table: keyof typeof rows) => ({
      select: () => ({
        order: async () => ({ data: rows[table], error: null }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async (
          object: string,
          body: string | Buffer,
          opts: { contentType?: string }
        ) => {
          store.uploads.push({ object, body, contentType: opts.contentType });
          return { data: { path: object }, error: null };
        },
        remove: async (paths: string[]) => {
          store.removed.push(paths);
          return { data: [], error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  store.uploads = [];
  store.removed = [];
  delete process.env.BACKUP_PUBLIC_KEY;
});

describe("runBackupToStorage", () => {
  it("uploads plaintext JSON when no public key is configured", async () => {
    const result = await runBackupToStorage(fakeDb(), "2026-07");
    expect(result.encrypted).toBe(false);
    expect(result.object).toBe("verum-backup-2026-07.json");
    expect(result.counts).toEqual({ entries: 2, quotes: 1, life_markers: 1 });

    const up = store.uploads[0];
    expect(up.contentType).toBe("application/json");
    expect(JSON.parse(up.body as string).entries).toHaveLength(2);
    expect(store.removed).toHaveLength(0); // nothing to clean up
  });

  it("seals to the age recipient and round-trips with the offline identity", async () => {
    const identity = await generateIdentity();
    process.env.BACKUP_PUBLIC_KEY = await identityToRecipient(identity);

    const result = await runBackupToStorage(fakeDb(), "2026-07");
    expect(result.encrypted).toBe(true);
    expect(result.object).toBe("verum-backup-2026-07.json.age");

    const up = store.uploads[0];
    expect(up.contentType).toBe("application/octet-stream");

    // The journal must not be readable from the stored bytes.
    const stored = up.body as Buffer;
    expect(stored.includes("a quiet day")).toBe(false);

    // …but the owner's offline identity opens it exactly.
    const d = new Decrypter();
    d.addIdentity(identity);
    const restored = JSON.parse(
      await d.decrypt(new Uint8Array(stored), "text")
    );
    expect(restored.entries).toEqual(rows.verum_entries);
    expect(restored.counts.entries).toBe(2);
  });

  it("sweeps the month's plaintext object after an encrypted upload", async () => {
    const identity = await generateIdentity();
    process.env.BACKUP_PUBLIC_KEY = await identityToRecipient(identity);

    await runBackupToStorage(fakeDb(), "2026-07");
    expect(store.removed).toEqual([["verum-backup-2026-07.json"]]);
  });

  it("hard-fails on a malformed key rather than falling back to plaintext", async () => {
    process.env.BACKUP_PUBLIC_KEY = "age1notarealrecipient";
    await expect(runBackupToStorage(fakeDb(), "2026-07")).rejects.toThrow();
    expect(store.uploads).toHaveLength(0);
  });
});
