"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, List, Grid3x3 } from "lucide-react";

export type Tab = "today" | "journal" | "life" | "reminders";

const NAV_ITEMS: { id: Tab; label: string; Icon: typeof CalendarDays }[] = [
  { id: "today", label: "Today", Icon: CalendarDays },
  { id: "journal", label: "Journal", Icon: List },
  { id: "life", label: "Life", Icon: Grid3x3 },
];

/* How far the refraction reaches in from the pill's edge, and how softly it
   fades to optically-flat in the middle. Px, in the pill's own coordinates. */
const LENS_RING = 8;
const LENS_RING_SOFTNESS = 4;

/* Displacement map for the lens, drawn at the pill's exact pixel size. In an
   feDisplacementMap the red channel moves the backdrop horizontally and green
   vertically, with 0.5 ("#808080") meaning "don't move". The edge gradients
   pull samples inward — magnification, like looking through the thick rim of
   real glass — and the blurred neutral capsule keeps the middle flat, so only
   the rim refracts. */
function lensMap(w: number, h: number): string {
  const rx = Math.max(2, h / 2 - LENS_RING);
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
        `<defs>` +
        `<linearGradient id="x" x1="0" y1="0" x2="1" y2="0">` +
        `<stop offset="0" stop-color="#FF0000"/><stop offset="1" stop-color="#000000"/>` +
        `</linearGradient>` +
        `<linearGradient id="y" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="#00FF00"/><stop offset="1" stop-color="#000000"/>` +
        `</linearGradient>` +
        `<filter id="b"><feGaussianBlur stdDeviation="${LENS_RING_SOFTNESS}"/></filter>` +
        `</defs>` +
        `<rect width="${w}" height="${h}" fill="#000000"/>` +
        `<rect width="${w}" height="${h}" fill="url(#x)"/>` +
        `<rect width="${w}" height="${h}" fill="url(#y)" style="mix-blend-mode:screen"/>` +
        `<rect x="${LENS_RING}" y="${LENS_RING}" width="${w - 2 * LENS_RING}" ` +
        `height="${h - 2 * LENS_RING}" rx="${rx}" fill="#808080" filter="url(#b)"/>` +
        `</svg>`
    )
  );
}

const ISOLATE_R = "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0";
const ISOLATE_G = "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0";
const ISOLATE_B = "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0";

/* The refraction filter the pill's backdrop is pushed through. Everything is
   sized in absolute px via userSpaceOnUse — percentage feImage sizing resolves
   against the wrong coordinate space inside backdrop-filter and silently
   breaks the map alignment. Three displacement passes at slightly different
   strengths, recombined one colour channel each, give the faint chromatic
   fringing real glass has at its rim. */
function LensFilter({ w, h }: { w: number; h: number }) {
  return (
    <svg className="lg-defs" aria-hidden="true" focusable="false">
      <filter
        id="lg-lens"
        x="0"
        y="0"
        width={w}
        height={h}
        filterUnits="userSpaceOnUse"
        primitiveUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={lensMap(w, h)}
          x="0"
          y="0"
          width={w}
          height={h}
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale="26"
          xChannelSelector="R"
          yChannelSelector="G"
          result="dispR"
        />
        <feColorMatrix in="dispR" type="matrix" values={ISOLATE_R} result="chR" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale="22"
          xChannelSelector="R"
          yChannelSelector="G"
          result="dispG"
        />
        <feColorMatrix in="dispG" type="matrix" values={ISOLATE_G} result="chG" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale="18"
          xChannelSelector="R"
          yChannelSelector="G"
          result="dispB"
        />
        <feColorMatrix in="dispB" type="matrix" values={ISOLATE_B} result="chB" />
        <feBlend in="chR" in2="chG" mode="screen" result="chRG" />
        <feBlend in="chRG" in2="chB" mode="screen" />
      </filter>
    </svg>
  );
}

// Liquid glass pill: refracting body, specular rim, and a gel capsule that
// squashes as it travels to the selected tab. Reminders is reachable from the
// header menu, not the pill, so it has no bubble position.
export default function BottomNav({
  tab,
  onSelect,
}: {
  tab: Tab;
  onSelect: (tab: Tab) => void;
}) {
  const activeIndex = NAV_ITEMS.findIndex((it) => it.id === tab);
  const navRef = useRef<HTMLElement>(null);

  /* SVG-filter refraction only renders in Chromium. Safari and Firefox parse
     `backdrop-filter: url(...)` (so CSS.supports alone lies) but never apply
     it, which would silently kill the whole backdrop — hence the extra
     Chromium check before opting in. Everyone else keeps the layered-glass
     fallback. The filter is rebuilt at the pill's measured size whenever it
     changes (rotation, text-size change), keeping the lens ring aligned. */
  const [lensSize, setLensSize] = useState<{ w: number; h: number } | null>(
    null
  );
  useEffect(() => {
    const el = navRef.current;
    const capable =
      el !== null &&
      "chrome" in window &&
      typeof CSS !== "undefined" &&
      CSS.supports("backdrop-filter", "url(#lg-lens)") &&
      typeof ResizeObserver !== "undefined";
    if (!capable) return;
    const ro = new ResizeObserver(() => {
      setLensSize({
        w: Math.round(el.offsetWidth),
        h: Math.round(el.offsetHeight),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {lensSize && <LensFilter w={lensSize.w} h={lensSize.h} />}
      <nav
        ref={navRef}
        className={"bottom-nav" + (lensSize ? " lens" : "")}
        aria-label="Sections"
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
        >
          {/* keyed so every tab change remounts it and replays the gel squash */}
          <span key={activeIndex} className="nav-bubble-gel" />
        </span>
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
    </>
  );
}
