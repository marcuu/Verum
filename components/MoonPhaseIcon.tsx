import { getMoonPhase } from "@/lib/moonPhase";

const SIZE = 26;
const R = SIZE / 2;

export default function MoonPhaseIcon() {
  const { phase, label } = getMoonPhase();

  // Determine waxing (0–0.5) vs waning (0.5–1)
  const isWaxing = phase <= 0.5;

  // Normalised illumination angle: 0 at new moon, 1 at full, 0 at new again
  // Maps phase 0→0.5 to illumination 0→1, and 0.5→1 to illumination 1→0
  const illumination = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;

  // The terminator ellipse x-radius ranges from R (new/full) to 0 (quarter).
  // When illumination < 0.5 the shadow side dominates; when > 0.5 the lit side does.
  // rx of the inner ellipse (terminator):
  //   illumination=0 → rx=R (full shadow half covers lit half exactly)
  //   illumination=0.5 → rx=0 (quarter moon, terminator is a straight line)
  //   illumination=1 → rx=R (full moon, terminator covers shadow half)
  const terminatorRx = Math.abs(1 - illumination * 2) * R;

  // For the SVG path we draw: a lit semicircle + a terminator half-ellipse.
  // The lit semicircle is always on the right for waxing, left for waning.
  // The terminator bulges toward or away from the lit side depending on phase.

  // lit side: right (+x) for waxing, left (-x) for waning
  const litDir = isWaxing ? 1 : -1;

  // The semicircle sweep: lit half of the circle
  // Top of circle → bottom, sweeping toward lit side
  const litSweep = litDir === 1 ? 1 : 0;

  // Terminator ellipse sweep direction:
  //   When crescent (illumination < 0.5): terminator bulges away from lit side (concave toward it)
  //   When gibbous (illumination > 0.5): terminator bulges toward lit side (convex toward it)
  const terminatorSweep = illumination < 0.5 ? litSweep : 1 - litSweep;

  // Path: start at top (R,0), arc to bottom (R, SIZE) as lit semicircle,
  // then arc back to top using the terminator ellipse.
  const d = [
    `M ${R} 0`,
    // Outer semicircle arc (lit side)
    `A ${R} ${R} 0 0 ${litSweep} ${R} ${SIZE}`,
    // Terminator ellipse back to top
    `A ${terminatorRx} ${R} 0 0 ${terminatorSweep} ${R} 0`,
    "Z",
  ].join(" ");

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label={label}
      role="img"
      style={{ flexShrink: 0 }}
    >
      {/* Background circle */}
      <circle cx={R} cy={R} r={R} fill="var(--bg)" stroke="var(--ink)" strokeWidth="1.5" />
      {/* Lit portion */}
      <path d={d} fill="var(--ink)" transform={`translate(0, 0)`} />
    </svg>
  );
}
