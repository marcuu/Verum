"use client";

import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Trash2 } from "lucide-react";
import type { Entry } from "@/lib/types";

// The month lives in the group header, so the row only needs the day:
// "Wed 2". The full ISO date stays available on hover via title.
function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Wrap search matches in <mark>. Commit reads textContent, so the marks
// never touch the stored text.
function highlightSegments(text: string, query: string): ReactNode {
  const q = query.toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  for (;;) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(<mark key={idx}>{text.slice(idx, idx + q.length)}</mark>);
    i = idx + q.length;
  }
  return parts;
}

export default function EntryRow({
  entry,
  index = 0,
  highlight,
  onSave,
  onDelete,
}: {
  entry: Entry;
  index?: number;
  highlight?: string;
  onSave: (day: string, text: string) => Promise<void>;
  onDelete: (day: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  async function commit() {
    const el = ref.current;
    if (!el) return;
    const newText = (el.textContent || "").trim();
    if (newText && newText !== entry.text) {
      try {
        await onSave(entry.day, newText);
        entry.text = newText;
      } catch {
        el.textContent = entry.text; // revert on failure
      }
    } else {
      el.textContent = entry.text;
    }
  }

  return (
    <li style={{ "--i": index } as CSSProperties}>
      <div className="day" title={entry.day}>
        {dayLabel(entry.day)}
      </div>
      <div
        className="text"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLDivElement).blur();
          }
        }}
        onBlur={commit}
      >
        {highlight ? highlightSegments(entry.text, highlight) : entry.text}
      </div>
      <div className="actions">
        <button
          className="ghost"
          type="button"
          aria-label={`Delete entry for ${entry.day}`}
          title="Delete"
          onClick={() => onDelete(entry.day)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}
