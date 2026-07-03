"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api, todayISO, yesterdayISO } from "@/lib/client";
import {
  queuePendingEntry,
  listPendingEntries,
  clearPendingEntry,
} from "@/lib/offline";
import { CAPTURE_PROMPT } from "@/lib/constants";
import { computeStreak } from "@/lib/streak";
import { birthdayWindow } from "@/lib/lifeWeeks";
import { excerpt } from "@/lib/notifications/reflection";
import type { StreakInfo } from "@/lib/streak";
import type { Entry, Quote } from "@/lib/types";
import QuoteBox from "@/components/QuoteBox";
import EntryRow from "@/components/EntryRow";
import PastEntries from "@/components/PastEntries";
import LifeCalendar from "@/components/LifeCalendar";
import StreakBanner from "@/components/StreakBanner";
import NotificationSettings from "@/components/NotificationSettings";
import QuoteComposer from "@/components/QuoteComposer";
import MoonPhaseIcon from "@/components/MoonPhaseIcon";
import HeaderMenu from "@/components/HeaderMenu";
import BottomNav, { type Tab } from "@/components/BottomNav";

type FlashAction = { label: string; run: () => void | Promise<void> };
type FlashState = { message: string; action?: FlashAction };

export default function Home() {
  const [tab, setTab] = useState<Tab>("today");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedDraft, setSavedDraft] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [pastEntries, setPastEntries] = useState<Entry[]>([]);

  const [todayEditMode, setTodayEditMode] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  // One-tap yesterday catch-up: a missed day is recoverable right from Today.
  const [catchupOpen, setCatchupOpen] = useState(false);
  const [catchupDraft, setCatchupDraft] = useState("");
  const catchupRef = useRef<HTMLInputElement>(null);

  // Moments: once today is logged, capture appends — it never opens an editor.
  const [momentDraft, setMomentDraft] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);
  // True only for the reveal that immediately follows today's first save, so
  // the reward arrives as a small ceremony rather than just appearing.
  const [quoteJustEarned, setQuoteJustEarned] = useState(false);

  const [flash, setFlash] = useState<FlashState | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const entryRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- inline feedback (replaces alert/confirm) ----
  const showFlash = useCallback(
    (message: string, action?: FlashAction, ms = 6000) => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setFlash({ message, action });
      flashTimer.current = setTimeout(() => setFlash(null), ms);
    },
    []
  );
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  // ---- data ----
  // Returns today's entry if found (only on unfiltered fetches).
  const loadEntries = useCallback(async (q: string) => {
    const data = await api<Entry[]>(
      "/entries" + (q ? `?q=${encodeURIComponent(q)}` : "")
    );
    setEntries(data);
    if (!q) {
      const today = todayISO();
      const todayEntry = data.find((e) => e.day === today);
      if (todayEntry) {
        setDraft(todayEntry.text);
        setSavedDraft(todayEntry.text);
      }
      const info = computeStreak(data.map((e) => e.day), today);
      setStreak(info);
      setHasLoggedToday(info.loggedToday);
      return todayEntry ?? null;
    }
    return null;
  }, []);

  const refreshQuote = useCallback(async () => {
    setQuoteLoading(true);
    try {
      const data = await api<{ quote: Quote | null }>("/quotes/daily");
      setQuote(data?.quote ?? null);
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  // On this day in prior years — real entries sharing today's month-day.
  const loadPastEntries = useCallback(async () => {
    try {
      const data = await api<Entry[]>("/entries/anniversaries");
      setPastEntries(data);
    } catch {
      setPastEntries([]); // recall is a quiet extra; failing it is silent.
    }
  }, []);

  // initial load — quote only fires if today's entry already exists
  useEffect(() => {
    const d = new Date();
    setTodayLabel(
      d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    );
    loadEntries("")
      .then((todayEntry) => {
        if (todayEntry) refreshQuote();
      })
      .catch(() => showFlash("Couldn't load your entries. Reload to retry."));
    loadPastEntries();
  }, [loadEntries, refreshQuote, showFlash, loadPastEntries]);

  // The earned-reveal is a one-shot: once the quote has arrived and played its
  // entrance, drop the flag so switching tabs doesn't replay the ceremony.
  useEffect(() => {
    if (!quoteJustEarned || !quote) return;
    const t = setTimeout(() => setQuoteJustEarned(false), 1200);
    return () => clearTimeout(t);
  }, [quoteJustEarned, quote]);

  // Debounced search. Skipped on first render: the initial-load effect above
  // already fetches the unfiltered list, so running here too would issue a
  // duplicate full-journal request racing the first one.
  const searchBooted = useRef(false);
  useEffect(() => {
    if (!searchBooted.current) {
      searchBooted.current = true;
      return;
    }
    const t = setTimeout(() => {
      loadEntries(search.trim()).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [search, loadEntries]);

  // ---- entry handlers ----
  const saveEntry = useCallback(
    async (day: string, text: string) => {
      await api("/entries", {
        method: "POST",
        body: JSON.stringify({ day, text }),
      });
    },
    []
  );

  const onSaveDraft = useCallback(async () => {
    const text = draft.trim();
    if (!text || text === savedDraft) return;
    // Optimistic transition: show the logged state immediately before the
    // round-trip completes so the UI feels instant.
    const wasLoggedToday = hasLoggedToday;
    setSavedDraft(text);
    setHasLoggedToday(true);
    setTodayEditMode(false);
    try {
      await saveEntry(todayISO(), text);
      // Non-blocking reload so streak and entry list update in background.
      loadEntries("").catch(() => {});
      if (!wasLoggedToday) {
        setQuoteJustEarned(true);
        refreshQuote();
      }
    } catch (err) {
      // No network? The words are already safe on-device — keep the logged
      // state and sync when the connection returns. Server errors still revert.
      const offline =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        err instanceof TypeError;
      if (offline && queuePendingEntry(todayISO(), text)) {
        showFlash("Offline — saved on this device. It'll sync when you're back.");
        return;
      }
      // Revert optimistic update on failure.
      setSavedDraft(savedDraft);
      setHasLoggedToday(wasLoggedToday);
      setTodayEditMode(wasLoggedToday);
      showFlash("Couldn't save. Try again.");
    }
  }, [draft, savedDraft, hasLoggedToday, saveEntry, loadEntries, refreshQuote, showFlash]);

  // Append a moment to today without touching what's already written.
  const onAddMoment = useCallback(async () => {
    const moment = momentDraft.trim();
    if (!moment) return;
    const base = savedDraft.trim();
    const text = base ? `${base}\n${moment}` : moment;
    // Optimistic: the moment joins the day immediately.
    setMomentDraft("");
    setSavedDraft(text);
    setDraft(text);
    try {
      await saveEntry(todayISO(), text);
      loadEntries("").catch(() => {});
    } catch (err) {
      const offline =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        err instanceof TypeError;
      if (offline && queuePendingEntry(todayISO(), text)) {
        showFlash("Offline — saved on this device. It'll sync when you're back.");
        return;
      }
      setSavedDraft(base);
      setDraft(base);
      setMomentDraft(moment); // give the words back
      showFlash("Couldn't save. Try again.");
    }
  }, [momentDraft, savedDraft, saveEntry, loadEntries, showFlash]);

  // ---- offline sync ----
  // Replay queued entries when the connection returns (and on load, in case
  // the app was closed offline). The upsert makes replays idempotent.
  const flushPending = useCallback(async () => {
    const pending = listPendingEntries();
    if (pending.length === 0) return;
    let synced = 0;
    for (const p of pending) {
      try {
        await saveEntry(p.day, p.text);
        clearPendingEntry(p.day);
        synced++;
      } catch {
        break; // still unreachable — the 'online' event will retry
      }
    }
    if (synced > 0) {
      const todayEntry = await loadEntries("").catch(() => null);
      if (todayEntry) refreshQuote();
      showFlash(
        synced === 1 ? "Offline entry synced." : `${synced} offline entries synced.`
      );
    }
  }, [saveEntry, loadEntries, refreshQuote, showFlash]);

  useEffect(() => {
    flushPending();
    window.addEventListener("online", flushPending);
    return () => window.removeEventListener("online", flushPending);
  }, [flushPending]);

  // Register the service worker up front so the shell caches for offline
  // launches — not only once reminders are enabled.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const onDeleteEntry = useCallback(
    async (day: string) => {
      const victim = entries.find((e) => e.day === day);
      if (!victim) return;
      const prev = entries;
      const next = entries.filter((e) => e.day !== day);
      const filtering = !!search.trim();

      // Optimistic removal; recompute streak locally when viewing the full list.
      setEntries(next);
      if (!filtering) {
        const info = computeStreak(next.map((e) => e.day), todayISO());
        setStreak(info);
        setHasLoggedToday(info.loggedToday);
        if (!info.loggedToday) setTodayEditMode(false);
      }

      try {
        await api(`/entries/${day}`, { method: "DELETE" });
      } catch {
        setEntries(prev);
        if (!filtering) {
          const info = computeStreak(prev.map((e) => e.day), todayISO());
          setStreak(info);
          setHasLoggedToday(info.loggedToday);
        }
        showFlash("Couldn't delete that entry.");
        return;
      }

      showFlash(`Deleted ${day}.`, {
        label: "Undo",
        run: async () => {
          try {
            await saveEntry(victim.day, victim.text);
            await loadEntries(search.trim());
          } catch {
            showFlash("Couldn't restore that entry.");
          }
        },
      });
    },
    [entries, search, saveEntry, loadEntries, showFlash]
  );

  const onExport = useCallback(async () => {
    try {
      const data = await api("/entries/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "verum-export.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      showFlash("Export failed. Try again.");
    }
  }, [showFlash]);

  // The archive a person opens in forty years: plain Markdown, year chapters.
  const onExportMarkdown = useCallback(async () => {
    try {
      const md = await api<string>("/entries/export?format=markdown");
      const blob = new Blob([md], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "verum-journal.md";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      showFlash("Export failed. Try again.");
    }
  }, [showFlash]);

  // Notification deep links: ?tab=… selects a section; ?export=1 starts an
  // export. Params are stripped afterwards so a reload doesn't repeat them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wantTab = params.get("tab");
    const wantExport = params.get("export") === "1";

    // Accept both current names and legacy names for backward compat with
    // notifications that may still use the old tab identifiers.
    const tabMap: Record<string, Tab> = {
      today: "today",
      quote: "today",   // legacy
      journal: "journal",
      record: "journal", // legacy
      life: "life",
      reminders: "reminders",
    };
    if (wantTab && wantTab in tabMap) {
      setTab(tabMap[wantTab]);
    }

    if (wantExport) {
      onExport();
    }

    if (wantTab || params.has("export")) {
      params.delete("tab");
      params.delete("export");
      const next = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }${window.location.hash}`;
      window.history.replaceState({}, "", next);
    }
  }, [onExport]);

  const onLogout = useCallback(async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }, []);

  // ---- quote handlers ----
  const onVote = useCallback(
    async (delta: 1 | -1) => {
      if (!quote || quoteBusy) return;
      setQuoteBusy(true);
      try {
        const data = await api<{ quote: Quote | null }>(
          `/quotes/${quote.id}/vote`,
          { method: "POST", body: JSON.stringify({ delta }) }
        );
        setQuote(data?.quote ?? null);
      } catch {
        showFlash("Couldn't register that vote.");
      } finally {
        setQuoteBusy(false);
      }
    },
    [quote, quoteBusy, showFlash]
  );

  const onDeleteQuote = useCallback(async () => {
    if (!quote) return;
    const victim = quote;
    setQuoteBusy(true);
    try {
      await api(`/quotes/${victim.id}`, { method: "DELETE" });
      await refreshQuote();
      showFlash("Quote removed.", {
        label: "Undo",
        run: async () => {
          try {
            await api("/quotes", {
              method: "POST",
              body: JSON.stringify({
                text: victim.text,
                author: victim.author,
              }),
            });
            await refreshQuote();
          } catch {
            showFlash("Couldn't restore the quote.");
          }
        },
      });
    } catch {
      showFlash("Couldn't remove the quote.");
    } finally {
      setQuoteBusy(false);
    }
  }, [quote, refreshQuote, showFlash]);

  const onQuoteAdded = useCallback(() => {
    showFlash("Quote added.");
    // If today's logged but the reward is empty (a fresh pool), the just-added
    // quote can now fill it — so ask for today's pick again.
    if (hasLoggedToday && !quote) refreshQuote();
  }, [showFlash, hasLoggedToday, quote, refreshQuote]);

  // ---- search reveal ----
  const openSearch = useCallback(() => {
    setTab("journal");
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    setSearch("");
    setSearchOpen(false);
  }, []);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSaveDraft();
      }
      if (e.key === "/" && !isEditableTarget) {
        e.preventDefault();
        openSearch();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSaveDraft, openSearch]);

  const showCue = draft.trim() !== "" && draft.trim() !== savedDraft;
  const filtering = !!search.trim();

  // For a week after each birthday, Today offers the closed year's review.
  const birthday = birthdayWindow(
    process.env.NEXT_PUBLIC_DOB ?? "1993-12-19",
    todayISO()
  );

  // The greeting: before asking for anything, the record gives one line back —
  // yesterday's last moment, or the most recent entry for longer gaps.
  const greeting = useMemo(() => {
    if (hasLoggedToday || filtering || entries.length === 0) return null;
    const today = todayISO();
    const source =
      entries.find((e) => e.day === yesterdayISO()) ??
      entries.find((e) => e.day < today);
    if (!source) return null;
    const lastLine =
      source.text.trim().split("\n").filter(Boolean).pop() ?? "";
    if (!lastLine) return null;
    const label =
      source.day === yesterdayISO()
        ? "Yesterday"
        : new Date(`${source.day}T00:00:00Z`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          });
    return { label, line: excerpt(lastLine, 90) };
  }, [hasLoggedToday, filtering, entries]);

  // ---- yesterday catch-up ----
  // Offered only when the record already exists (a brand-new journal starts
  // with today, not homework) and the list is unfiltered so `entries` is the
  // full record.
  const yesterdayMissing =
    !filtering &&
    entries.length > 0 &&
    !entries.some((e) => e.day === yesterdayISO());

  const onSaveYesterday = useCallback(async () => {
    const text = catchupDraft.trim();
    if (!text) return;
    try {
      await saveEntry(yesterdayISO(), text);
      setCatchupOpen(false);
      setCatchupDraft("");
      await loadEntries("");
      showFlash("Yesterday logged.");
    } catch {
      showFlash("Couldn't save yesterday's entry. Try again.");
    }
  }, [catchupDraft, saveEntry, loadEntries, showFlash]);

  // Record shows the most recent entries by default; search always shows all matches.
  const RECORD_PREVIEW = 7;
  const collapsed = !filtering && !showAll && entries.length > RECORD_PREVIEW;
  const visibleEntries = collapsed
    ? entries.slice(0, RECORD_PREVIEW)
    : entries;

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <MoonPhaseIcon />
          <h1>Verum</h1>
        </div>
        <div className="utility">
          <HeaderMenu
            onAddQuote={() => setComposerOpen(true)}
            onOpenReminders={() => setTab("reminders")}
            onExportJson={onExport}
            onExportMarkdown={onExportMarkdown}
            onLogout={onLogout}
          />
        </div>
      </header>

      {/* ===== ZONE 1 — TODAY ===== */}
      <section
        className={"today" + (hasLoggedToday ? " today--logged" : "")}
        aria-label="Today"
        hidden={tab !== "today"}
      >
        <p className="today-date">{todayLabel}</p>

        {/* ── The greeting: the record gives before it asks ── */}
        {greeting && (
          <p className="greeting">
            {greeting.label} — &ldquo;{greeting.line}&rdquo;
          </p>
        )}

        {/* ── Unlogged state: capture hero ── */}
        {!hasLoggedToday && (
          <div className="capture capture-row">
            <input
              ref={entryRef}
              autoFocus
              type="text"
              aria-label="Today's entry"
              placeholder={CAPTURE_PROMPT}
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSaveDraft();
                }
              }}
            />
            <span className={"capture-cue" + (showCue ? " show" : "")}>
              ↵ to save
            </span>
          </div>
        )}

        {/* ── Logged state: the day as its moments; tap to correct ── */}
        {hasLoggedToday && !todayEditMode && (
          <>
            <button
              className="moments-block"
              type="button"
              aria-label="Edit today's entry"
              onClick={() => {
                setTodayEditMode(true);
                requestAnimationFrame(() => {
                  const el = editRef.current;
                  if (el) {
                    el.focus();
                    el.setSelectionRange(el.value.length, el.value.length);
                  }
                });
              }}
            >
              {savedDraft
                .split("\n")
                .filter((m) => m.trim())
                .map((m, i) => (
                  <p className="moment" key={i}>
                    {m}
                  </p>
                ))}
            </button>
            <div className="capture capture-row moment-row">
              <input
                type="text"
                aria-label="Add a moment"
                placeholder="Add a moment…"
                autoComplete="off"
                value={momentDraft}
                onChange={(e) => setMomentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddMoment();
                  }
                }}
              />
              <span
                className={"capture-cue" + (momentDraft.trim() ? " show" : "")}
              >
                ↵ to add
              </span>
            </div>
          </>
        )}

        {/* ── Logged edit mode: the whole day, newlines intact ── */}
        {hasLoggedToday && todayEditMode && (
          <div className="capture capture-edit">
            <textarea
              ref={editRef}
              className="capture-textarea"
              aria-label="Today's entry"
              placeholder={CAPTURE_PROMPT}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  onSaveDraft();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setDraft(savedDraft);
                  setTodayEditMode(false);
                }
              }}
            />
            <span className={"capture-cue" + (showCue ? " show" : "")}>
              ⌘↵ to save · esc to cancel
            </span>
          </div>
        )}

        {/* ── Yesterday catch-up: one tap from Today, never a nag ── */}
        {yesterdayMissing && !catchupOpen && (
          <button
            className="catchup-line"
            type="button"
            onClick={() => {
              setCatchupOpen(true);
              requestAnimationFrame(() => catchupRef.current?.focus());
            }}
          >
            Yesterday went unlogged — add a line?
          </button>
        )}
        {yesterdayMissing && catchupOpen && (
          <div className="capture capture-row catchup-row">
            <input
              ref={catchupRef}
              type="text"
              aria-label="Yesterday's entry"
              placeholder="What happened yesterday?"
              autoComplete="off"
              value={catchupDraft}
              onChange={(e) => setCatchupDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSaveYesterday();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setCatchupOpen(false);
                }
              }}
            />
            <span
              className={"capture-cue" + (catchupDraft.trim() ? " show" : "")}
            >
              ↵ to save
            </span>
          </div>
        )}

        <PastEntries entries={pastEntries} today={todayISO()} />

        <StreakBanner streak={streak} />

        {/* ── Birthday moment: the year that just closed, offered quietly ── */}
        {birthday.active && birthday.closedAge !== null && (
          <Link className="catchup-line birthday-line" href={`/year/${birthday.closedAge}`}>
            A year of your life just closed — see age {birthday.closedAge} against
            the calendar
          </Link>
        )}

        {hasLoggedToday && (
          <QuoteBox
            quote={quote}
            loading={quoteLoading}
            busy={quoteBusy}
            celebrate={quoteJustEarned}
            onVote={onVote}
            onDelete={onDeleteQuote}
            onAdd={() => setComposerOpen(true)}
          />
        )}
      </section>

      {/* ===== ZONE 2 — JOURNAL ===== */}
      <section
        className="record"
        aria-label="Journal"
        hidden={tab !== "journal"}
      >
        <div className="record-head">
          <p className="overline">Journal</p>
          <button
            className="ghost"
            type="button"
            onClick={searchOpen ? closeSearch : openSearch}
            aria-label={searchOpen ? "Close search" : "Search entries"}
            title="Search (/)"
          >
            <Search size={18} />
          </button>
        </div>

        {searchOpen && (
          <input
            id="search"
            ref={searchRef}
            type="search"
            aria-label="Search previous entries"
            placeholder="Search previous entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeSearch();
              }
            }}
          />
        )}

        {entries.length === 0 ? (
          <p className="empty">
            {filtering ? "No matching entries." : "No entries yet."}
          </p>
        ) : (
          <>
            <ul>
              {visibleEntries.map((e) => (
                <EntryRow
                  key={e.day}
                  entry={e}
                  onSave={saveEntry}
                  onDelete={onDeleteEntry}
                />
              ))}
            </ul>
            {collapsed && (
              <button
                className="record-cta"
                type="button"
                onClick={() => setShowAll(true)}
              >
                Show all {entries.length} entries
              </button>
            )}
            {!filtering && showAll && entries.length > RECORD_PREVIEW && (
              <button
                className="record-cta"
                type="button"
                onClick={() => setShowAll(false)}
              >
                Show fewer
              </button>
            )}
          </>
        )}
      </section>

      {/* ===== REMINDERS ===== */}
      <div hidden={tab !== "reminders"} aria-label="Reminders">
        <NotificationSettings />
      </div>

      {/* ===== ZONE 3 — LIFE ===== */}
      <div hidden={tab !== "life"} aria-label="Life">
        <LifeCalendar entries={entries} />
      </div>

      <BottomNav tab={tab} onSelect={setTab} />

      <QuoteComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onAdded={onQuoteAdded}
      />

      {flash && (
        <div className="flash" role="status">
          <span>{flash.message}</span>
          {flash.action && (
            <button
              type="button"
              onClick={() => {
                const run = flash.action!.run;
                setFlash(null);
                run();
              }}
            >
              {flash.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
