export default function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading content" role="status">
      <div className="h-9 w-56 rounded-lg bg-white/[0.06]" />
      <div className="h-4 w-80 max-w-full rounded bg-white/[0.04]" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }, (_, index) => <div key={index} className="h-40 rounded-2xl border border-white/[0.06] bg-white/[0.025]" />)}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
