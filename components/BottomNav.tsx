"use client";

import { CalendarDays, List, Grid3x3 } from "lucide-react";

export type Tab = "today" | "journal" | "life" | "reminders";

const NAV_ITEMS: { id: Tab; label: string; Icon: typeof CalendarDays }[] = [
  { id: "today", label: "Today", Icon: CalendarDays },
  { id: "journal", label: "Journal", Icon: List },
  { id: "life", label: "Life", Icon: Grid3x3 },
];

// Liquid glass pill with a sliding bubble under the active tab. Reminders is
// reachable from the header menu, not the pill, so it has no bubble position.
export default function BottomNav({
  tab,
  onSelect,
}: {
  tab: Tab;
  onSelect: (tab: Tab) => void;
}) {
  const activeIndex = NAV_ITEMS.findIndex((it) => it.id === tab);
  return (
    <nav
      className="bottom-nav"
      aria-label="Sections"
      style={{ "--nav-count": NAV_ITEMS.length } as React.CSSProperties}
    >
      <span
        className="nav-bubble"
        aria-hidden="true"
        style={
          {
            "--active-index": activeIndex,
            opacity: activeIndex < 0 ? 0 : 1,
          } as React.CSSProperties
        }
      />
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={"nav-tab" + (tab === id ? " active" : "")}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onSelect(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
