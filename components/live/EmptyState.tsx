export default function EmptyState({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-6 text-center text-white/25">
      {icon}
      <p className="text-xs">{label}</p>
    </div>
  );
}
