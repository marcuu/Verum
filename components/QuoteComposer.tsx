"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/client";
import type { Quote } from "@/lib/types";

/**
 * Add a quote from inside the product. The daily quote is the reward at the
 * peak of the logging ritual; until now the only way to feed the pool was the
 * API. This is the in-product curation surface that retires that dead end.
 */
export default function QuoteComposer({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (quote: Quote) => void;
}) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Reset and focus each time the composer opens.
  useEffect(() => {
    if (!open) return;
    setText("");
    setAuthor("");
    setError("");
    setBusy(false);
    requestAnimationFrame(() => textRef.current?.focus());
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ ok: boolean; quote: Quote | null }>("/quotes", {
        method: "POST",
        body: JSON.stringify({ text: t, author: author.trim() }),
      });
      if (data?.quote) onAdded(data.quote);
      onClose();
    } catch {
      setError("Couldn't add that quote. Try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="composer-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="composerTitle"
      >
        <div className="composer-head">
          <h2 id="composerTitle">Add a quote</h2>
          <button
            className="ghost qIcon"
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <textarea
          ref={textRef}
          className="composer-text"
          placeholder="The words worth keeping…"
          rows={3}
          maxLength={600}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter saves; plain Enter stays a newline for multi-line quotes.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />

        <input
          className="composer-author"
          type="text"
          placeholder="Author (optional)"
          maxLength={120}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />

        {error && <div className="composer-error">{error}</div>}

        <div className="composer-actions">
          <button
            type="button"
            className="composer-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="composer-save"
            onClick={() => void submit()}
            disabled={!text.trim() || busy}
          >
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
