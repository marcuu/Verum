"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import type { Entry } from "@/lib/types";

// A journal shows dates a person would write, not database keys.
function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function EntryRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: Entry;
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
    <li>
      <div className="day" title={entry.day}>
        {formatDay(entry.day)}
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
        {entry.text}
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
