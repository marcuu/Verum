"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import type { Quote } from "@/lib/types";

export default function QuoteBox({
  quote,
  loading,
  busy,
  onVote,
  onDelete,
}: {
  quote: Quote | null;
  loading: boolean;
  busy: boolean;
  onVote: (delta: 1 | -1) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the overflow menu.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  // Honest emptiness: a reward you can't see beats a reward that points at
  // an API you can't reach. Show nothing until a quote actually exists.
  if (!loading && !quote) return null;

  const disabled = loading || busy || !quote;
  const text = loading ? "Loading quote…" : `"${quote!.text}"`;
  const author = !loading && quote!.author ? `— ${quote!.author}` : "";

  return (
    <section className="quoteBox" aria-label="Daily quote">
      <div className="qText">{text}</div>
      <div className="qAuthor">{author}</div>
      <div className="qActions" aria-label="Quote actions">
        <button
          className="ghost qIcon"
          type="button"
          aria-label="Thumbs up"
          title="Thumbs up"
          disabled={disabled}
          onClick={() => onVote(1)}
        >
          <ThumbsUp size={18} />
        </button>
        <button
          className="ghost qIcon"
          type="button"
          aria-label="Thumbs down"
          title="Thumbs down"
          disabled={disabled}
          onClick={() => onVote(-1)}
        >
          <ThumbsDown size={18} />
        </button>

        {/* Delete lives behind the overflow — not in the same row as votes. */}
        <div className="qOverflow" ref={menuRef}>
          <button
            className="ghost qIcon"
            type="button"
            aria-label="More options"
            title="More options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            disabled={disabled}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="qMenu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="qMenuItem qMenuItem--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
                Remove quote
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
