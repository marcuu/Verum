"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, LogOut } from "lucide-react";
import { api, todayISOUTC } from "@/lib/client";
import type { Entry, Quote } from "@/lib/types";
import QuoteBox from "@/components/QuoteBox";
import EntryRow from "@/components/EntryRow";
import LifeCalendar from "@/components/LifeCalendar";

const MAX = 280;

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [todayLabel, setTodayLabel] = useState("");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteBusy, setQuoteBusy] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const entryRef = useRef<HTMLInputElement>(null);

  // ---- data ----
  const loadEntries = useCallback(async (q: string) => {
    const data = await api<Entry[]>(
      "/entries" + (q ? `?q=${encodeURIComponent(q)}` : "")
    );
    setEntries(data);
    const today = data.find((e) => e.day === todayISOUTC());
    if (today) setDraft(today.text);
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

  // initial load
  useEffect(() => {
    const d = new Date();
    setTodayLabel(
      d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    );
    loadEntries("").catch((e) =>
      alert("Error loading entries.\n\n" + (e as Error).message)
    );
    refreshQuote();
  }, [loadEntries, refreshQuote]);

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
    if (!text) return;
    try {
      await saveEntry(todayISOUTC(), text);
      await loadEntries(search.trim());
      refreshQuote();
      entryRef.current?.focus();
      entryRef.current?.select();
    } catch (e) {
      alert("Save failed: " + (e as Error).message);
    }
  }, [draft, saveEntry, loadEntries, search, refreshQuote]);

  const onDeleteEntry = useCallback(
    async (day: string) => {
      if (!confirm(`Delete ${day}?`)) return;
      try {
        await api(`/entries/${day}`, { method: "DELETE" });
        await loadEntries(search.trim());
      } catch (e) {
        alert("Delete failed: " + (e as Error).message);
      }
    },
    [loadEntries, search]
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
    } catch (e) {
      alert("Export failed: " + (e as Error).message);
    }
  }, []);

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
      } catch (e) {
        alert("Vote failed: " + (e as Error).message);
      } finally {
        setQuoteBusy(false);
      }
    },
    [quote, quoteBusy]
  );

  const onDeleteQuote = useCallback(async () => {
    if (!quote) return;
    if (!confirm("Delete this quote?")) return;
    setQuoteBusy(true);
    try {
      await api(`/quotes/${quote.id}`, { method: "DELETE" });
      await refreshQuote();
    } catch (e) {
      alert("Delete failed: " + (e as Error).message);
    } finally {
      setQuoteBusy(false);
    }
  }, [quote, refreshQuote]);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSaveDraft();
      }
      if (e.key === "/" && document.activeElement !== entryRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSaveDraft]);

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="moon" aria-hidden="true" />
          <div>
            <h1>Verum</h1>
            <div className="sub">daily journal</div>
          </div>
        </div>
        <div className="topline">
          <span className="pill">{todayLabel}</span>
          <button className="ghost iconbtn" onClick={onExport}>
            <Download size={16} /> Export
          </button>
          <button className="ghost iconbtn" onClick={onLogout}>
            <LogOut size={16} /> Change token
          </button>
        </div>
      </header>

      <QuoteBox
        quote={quote}
        loading={quoteLoading}
        busy={quoteBusy}
        onVote={onVote}
        onDelete={onDeleteQuote}
      />

      <div id="bar">
        <input
          ref={entryRef}
          type="text"
          placeholder="What happened today?"
          autoComplete="off"
          maxLength={MAX}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSaveDraft();
            }
          }}
        />
        <button onClick={onSaveDraft}>Save (Enter)</button>
      </div>
      <div className="hint">
        <span>
          Keys: <b>Enter</b> save · <b>Ctrl/⌘+S</b> save · <b>/</b> search
        </span>
        <span className="counter">
          <span>{draft.length}</span>/{MAX}
        </span>
      </div>

      <input
        id="search"
        ref={searchRef}
        type="search"
        placeholder="Search previous entries…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul>
        {entries.map((e) => (
          <EntryRow
            key={e.day}
            entry={e}
            onSave={saveEntry}
            onDelete={onDeleteEntry}
          />
        ))}
      </ul>

      <LifeCalendar entries={entries} />
    </div>
  );
}
