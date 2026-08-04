/** Segmented donut chart with a built-in legend. Pure SVG — no charting dependency. */
export type DonutSegment = { label: string; value: number; color: string };

export default function DonutStat({
  segments,
  size = 132,
  thickness = 16,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const fraction = s.value / total;
                const start = cumulative;
                cumulative += fraction;
                const dash = fraction * circumference;
                return (
                  <circle
                    key={s.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-start * circumference}
                    strokeLinecap="butt"
                  />
                );
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold">{total > 0 ? Math.round(((segments[0]?.value ?? 0) / total) * 100) : 0}%</span>
          <span className="text-[10px] text-white/30">{segments[0]?.label}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-white/50">{s.label}</span>
            <span className="ml-auto font-semibold text-white">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
