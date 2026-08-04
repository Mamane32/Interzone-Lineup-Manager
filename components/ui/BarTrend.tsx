/** Simple day-by-day bar chart. Pure SVG/Tailwind — no charting dependency. */
export default function BarTrend({ data }: { data: { label: string; value: number; highlight?: boolean }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {data.map((d) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex h-32 w-full items-end">
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-700 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-panel transition-opacity group-hover:opacity-100">
              {d.value}
            </span>
            <div
              className={`w-full rounded-t-md transition-all duration-300 ${d.highlight ? "bg-gradient-to-t from-brand-400 to-brand-100" : "bg-white/[0.09] group-hover:bg-white/[0.16]"}`}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-white/30">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
