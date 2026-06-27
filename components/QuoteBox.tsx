"use client";

import { ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
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
  // Honest emptiness: a reward you can't see beats a reward that points at
  // an API you can't reach. Show nothing until a quote actually exists.
  if (!loading && !quote) return null;

  const disabled = loading || busy || !quote;
  const text = loading ? "Loading quote…" : `“${quote!.text}”`;
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
        <button
          className="ghost qIcon"
          type="button"
          aria-label="Delete quote"
          title="Delete"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </section>
  );
}
