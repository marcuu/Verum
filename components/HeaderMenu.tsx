"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Download,
  FileText,
  LogOut,
  Settings,
  Quote as QuoteIcon,
} from "lucide-react";

// The header overflow menu: quote curation, reminders, exports, logout.
// Owns its open/close state and the outside-click dismissal.
export default function HeaderMenu({
  onAddQuote,
  onOpenReminders,
  onExportJson,
  onExportMarkdown,
  onLogout,
}: {
  onAddQuote: () => void;
  onOpenReminders: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const item = (label: string, Icon: typeof Bell, run: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
      className={"headerMenuItem" + (danger ? " headerMenuItem--danger" : "")}
      onClick={() => {
        setOpen(false);
        run();
      }}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div className="headerMenuWrap" ref={wrapRef}>
      <button
        className="ghost"
        type="button"
        aria-label="Settings"
        title="Settings"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Settings size={18} />
      </button>
      {open && (
        <div className="headerMenu" role="menu">
          {item("Add a quote", QuoteIcon, onAddQuote)}
          {item("Reminders", Bell, onOpenReminders)}
          {item("Export (JSON)", Download, onExportJson)}
          {item("Export (Markdown)", FileText, onExportMarkdown)}
          {item("Log out", LogOut, onLogout, true)}
        </div>
      )}
    </div>
  );
}
