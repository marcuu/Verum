"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, LogOut, Search, CalendarDays, ChevronRight, List, Grid3x3, Bell, Settings } from "lucide-react";
import { api, todayISOUTC } from "@/lib/client";
import { CAPTURE_PROMPT } from "@/lib/constants";
import { computeStreak } from "@/lib/streak";
import type { StreakInfo } from "@/lib/streak";
import type { Entry, Quote } from "@/lib/types";
import QuoteBox from "@/components/QuoteBox";
import EntryRow from "@/components/EntryRow";
import PastEntries from "@/components/PastEntries";
import LifeCalendar from "@/components/LifeCalendar";
import StreakBanner from "@/components/StreakBanner";
import NotificationSettings from "@/components/NotificationSettings";
import MoonPhaseIcon from "@/components/MoonPhaseIcon";

type FlashAction = { label: string; run: () => void | Promise<void> };
type FlashState = { message: string; action?: FlashAction };

type Tab = "today" | "journal" | "life" | "reminders";

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

  const [flash, setFlash] = useState<FlashState | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const entryRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!headerMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [headerMenuOpen]);

  // ---- data ----
  // Returns today's entry if found (only on unfiltered fetches).
  const loadEntries = useCallback(async (q: string) => {
    const data = await api<Entry[]>(
      "/entries" + (q ? `?q=${encodeURIComponent(q)}` : "")
    );
    setEntries(data);
    if (!q) {
      const today = todayISOUTC();
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

  // debounced search
  useEffect(() => {
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
      await saveEntry(todayISOUTC(), text);
      // Non-blocking reload so streak and entry list update in background.
      loadEntries("").catch(() => {});
      if (!wasLoggedToday) refreshQuote();
    } catch {
      // Revert optimistic update on failure.
      setSavedDraft(savedDraft);
      setHasLoggedToday(wasLoggedToday);
      setTodayEditMode(wasLoggedToday);
      showFlash("Couldn't save. Try again.");
    }
  }, [draft, savedDraft, hasLoggedToday, saveEntry, loadEntries, refreshQuote, showFlash]);

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
        const info = computeStreak(next.map((e) => e.day), todayISOUTC());
        setStreak(info);
        setHasLoggedToday(info.loggedToday);
        if (!info.loggedToday) setTodayEditMode(false);
      }

      try {
        await api(`/entries/${day}`, { method: "DELETE" });
      } catch {
        setEntries(prev);
        if (!filtering) {
          const info = computeStreak(prev.map((e) => e.day), todayISOUTC());
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
          <div className="headerMenuWrap" ref={headerMenuRef}>
            <button
              className="ghost"
              type="button"
              aria-label="Settings"
              title="Settings"
              aria-expanded={headerMenuOpen}
              aria-haspopup="menu"
              onClick={() => setHeaderMenuOpen((o) => !o)}
            >
              <Settings size={18} />
            </button>
            {headerMenuOpen && (
              <div className="headerMenu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="headerMenuItem"
                  onClick={() => { setHeaderMenuOpen(false); onExport(); }}
                >
                  <Download size={15} aria-hidden="true" />
                  Export entries
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="headerMenuItem headerMenuItem--danger"
                  onClick={() => { setHeaderMenuOpen(false); onLogout(); }}
                >
                  <LogOut size={15} aria-hidden="true" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== ZONE 1 — TODAY ===== */}
      <section
        className={"today" + (hasLoggedToday ? " today--logged" : "")}
        aria-label="Today"
        hidden={tab !== "today"}
      >
        <p className="overline today-date">{todayLabel}</p>

        {/* ── Unlogged state: capture hero ── */}
        {!hasLoggedToday && (
          <div className="capture capture-row">
            <input
              ref={entryRef}
              autoFocus
              type="text"
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

        {/* ── Logged state: entry preview (tap to edit) ── */}
        {hasLoggedToday && !todayEditMode && (
          <button
            className="entry-preview-block"
            type="button"
            aria-label="Edit today's entry"
            onClick={() => {
              setTodayEditMode(true);
              requestAnimationFrame(() => {
                entryRef.current?.focus();
                entryRef.current?.select();
              });
            }}
          >
            <p className="entry-preview-text">{savedDraft}</p>
            <span className="entry-preview-cta">
              Continue
              <ChevronRight size={13} aria-hidden="true" />
            </span>
          </button>
        )}

        {/* ── Logged edit mode: inline continue writing ── */}
        {hasLoggedToday && todayEditMode && (
          <div className="capture capture-row">
            <input
              ref={entryRef}
              type="text"
              placeholder={CAPTURE_PROMPT}
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSaveDraft();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setTodayEditMode(false);
                }
              }}
            />
            <span className={"capture-cue" + (showCue ? " show" : "")}>
              ↵ to save
            </span>
          </div>
        )}

        <PastEntries entries={pastEntries} today={todayISOUTC()} />

        <StreakBanner streak={streak} />

        {hasLoggedToday && (
          <QuoteBox
            quote={quote}
            loading={quoteLoading}
            busy={quoteBusy}
            onVote={onVote}
            onDelete={onDeleteQuote}
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

      {/* ===== BOTTOM NAV ===== */}
      <nav className="bottom-nav" aria-label="Sections">
        <button
          type="button"
          className={"nav-tab" + (tab === "today" ? " active" : "")}
          aria-current={tab === "today" ? "page" : undefined}
          onClick={() => setTab("today")}
        >
          <CalendarDays size={20} />
          <span>Today</span>
        </button>
        <button
          type="button"
          className={"nav-tab" + (tab === "journal" ? " active" : "")}
          aria-current={tab === "journal" ? "page" : undefined}
          onClick={() => setTab("journal")}
        >
          <List size={20} />
          <span>Journal</span>
        </button>
        <button
          type="button"
          className={"nav-tab" + (tab === "reminders" ? " active" : "")}
          aria-current={tab === "reminders" ? "page" : undefined}
          onClick={() => setTab("reminders")}
        >
          <Bell size={20} />
          <span>Reminders</span>
        </button>
        <button
          type="button"
          className={"nav-tab" + (tab === "life" ? " active" : "")}
          aria-current={tab === "life" ? "page" : undefined}
          onClick={() => setTab("life")}
        >
          <Grid3x3 size={20} />
          <span>Life</span>
        </button>
      </nav>

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
