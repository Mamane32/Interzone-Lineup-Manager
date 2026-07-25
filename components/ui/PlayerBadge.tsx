export function JerseyBadge({ number }: { number: number }) {
  return <span className="jersey-badge">{String(number).padStart(2, "0")}</span>;
}

export function PlayerRow({
  number,
  name,
  trailing,
}: {
  number: number;
  name: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <JerseyBadge number={number} />
      <span className="flex-1 truncate font-medium">{name}</span>
      {trailing}
    </div>
  );
}
