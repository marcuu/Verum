// Cold-start veil. On a PWA launch the journal takes a beat to arrive from the
// network; without this the app would flash its empty/unlogged state before the
// real day lands. The veil is opaque from the first frame so nothing wrong is
// ever shown. The moon only fades in after a short delay (baked into its CSS
// animation), so a fast load shows nothing at all — the veil simply lifts — and
// only a genuinely slow load earns the breathing moon.
export default function ColdStart({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={"cold-start" + (leaving ? " cold-start--leaving" : "")}
      // Decorative to sighted users; the live region below carries the meaning.
      aria-hidden={leaving ? "true" : undefined}
    >
      <div className="cold-start-moon">
        {/* The wordmark's moon, grown and given breath. Two equal discs — one
            lit, one in shadow — slide past each other to wax and wane. */}
        <svg width="52" height="52" viewBox="0 0 48 48" role="img" aria-label="">
          <defs>
            <clipPath id="cold-start-clip">
              <circle cx="24" cy="24" r="23" />
            </clipPath>
          </defs>
          <circle className="cs-disc" cx="24" cy="24" r="23" />
          <g clipPath="url(#cold-start-clip)">
            <circle className="cs-shadow" cx="24" cy="24" r="23" />
          </g>
        </svg>
      </div>
      <span className="sr-only" role="status">
        Loading your journal…
      </span>
    </div>
  );
}
