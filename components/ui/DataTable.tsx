import type { ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import type { LucideIcon } from "lucide-react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /**
   * How this column folds into the stacked card shown below `md`.
   * "title" — rendered large, top of the card, no label (pick exactly one).
   * "meta" — rendered as a label/value line (the default).
   * "actions" — rendered full-width at the bottom of the card, no label.
   */
  cardRole?: "title" | "meta" | "actions";
};

/**
 * Renders as a real table at `md` and above, and as a stacked card list
 * below it — one component instead of a bespoke responsive layout per page.
 * Column definitions drive both: `cardRole` decides how each column folds
 * into the mobile card, so callers don't maintain two markups.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: { title: string; description: string; icon?: LucideIcon };
}) {
  if (rows.length === 0) {
    return empty ? (
      <EmptyState compact title={empty.title} description={empty.description} icon={empty.icon} />
    ) : (
      <div className="surface-panel p-10 text-center text-sm text-white/35">Nothing here yet.</div>
    );
  }

  const titleCol = columns.find((c) => c.cardRole === "title");
  const actionCol = columns.find((c) => c.cardRole === "actions");
  const metaCols = columns.filter((c) => c !== titleCol && c !== actionCol);

  return (
    <div className="surface-panel overflow-hidden p-0">
      {/* >= md: real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/30">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`whitespace-nowrap px-4 py-3 font-semibold ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition-colors hover:bg-white/[0.035] hover:shadow-[inset_3px_0_0_0_rgba(255,182,46,0.65)]"
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* < md: stacked cards */}
      <ul className="divide-y divide-white/[0.05] md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="p-4 transition-colors active:bg-white/[0.03]">
            {titleCol && <div className="text-sm font-semibold text-white">{titleCol.render(row)}</div>}
            {metaCols.length > 0 && (
              <dl className="mt-2.5 flex flex-col gap-1.5">
                {metaCols.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-3 text-xs">
                    <dt className="text-white/35">{c.header}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-white/75">{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actionCol && <div className="mt-3 flex flex-wrap gap-2">{actionCol.render(row)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
