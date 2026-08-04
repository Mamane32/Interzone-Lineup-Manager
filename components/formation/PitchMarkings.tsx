/** Pure SVG pitch markings — no image asset, no dependency. viewBox is 100x150 to match a real pitch's ~2:3 proportions, so circles render as true circles, not ellipses. */
export default function PitchMarkings() {
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="pitch-turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f3d24" />
          <stop offset="100%" stopColor="#0a2e1a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="150" fill="url(#pitch-turf)" />
      {/* Mow stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x="0" y={i * 18.75} width="100" height="18.75" fill={i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"} />
      ))}

      <g stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" fill="none">
        <rect x="5" y="5" width="90" height="140" />
        <line x1="5" y1="75" x2="95" y2="75" />
        <circle cx="50" cy="75" r="13" />
        <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.55)" stroke="none" />

        {/* Defending end (top) */}
        <rect x="25" y="5" width="50" height="30" />
        <rect x="38" y="5" width="24" height="11" />
        <circle cx="50" cy="24" r="0.8" fill="rgba(255,255,255,0.55)" stroke="none" />
        <path d="M 38 35 A 13 13 0 0 0 62 35" />

        {/* Attacking end (bottom) */}
        <rect x="25" y="115" width="50" height="30" />
        <rect x="38" y="134" width="24" height="11" />
        <circle cx="50" cy="126" r="0.8" fill="rgba(255,255,255,0.55)" stroke="none" />
        <path d="M 38 115 A 13 13 0 0 1 62 115" />

        {/* Corner arcs */}
        <path d="M 5 8 A 3 3 0 0 0 8 5" />
        <path d="M 92 5 A 3 3 0 0 0 95 8" />
        <path d="M 8 145 A 3 3 0 0 0 5 142" />
        <path d="M 95 142 A 3 3 0 0 0 92 145" />
      </g>
    </svg>
  );
}
