"use client";

import { useRef } from "react";
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
        <button className="ghost" onClick={() => onDelete(entry.day)}>
          Delete
        </button>
      </div>
    </li>
  );
}
