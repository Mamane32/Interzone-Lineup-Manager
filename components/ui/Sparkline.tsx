/** Tiny inline trend line for a KPI card. Pure SVG — no charting dependency. */
export default function Sparkline({ values, stroke = "#FFB62E" }: { values: number[]; stroke?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 92 - 4}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="h-9 w-full overflow-visible">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.9} />
    </svg>
  );
}
