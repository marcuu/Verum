"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import type { Entry } from "@/lib/types";

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
      <div className="day">{entry.day}</div>
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
