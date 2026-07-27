export default function SectionHeader({
  title,
  badge,
  action,
}: {
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">{title}</h2>
        {badge}
      </div>
      {action}
    </div>
  );
}
