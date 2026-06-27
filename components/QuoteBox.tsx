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
  const disabled = loading || busy || !quote;

  let text = "Loading quote…";
  let author = "";
  if (!loading) {
    if (!quote) {
      text = "No quotes yet. Add one via the API.";
    } else {
      text = `“${quote.text}”`;
      author = quote.author ? `— ${quote.author}` : "";
    }
  }

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
