import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatMatchDate } from "@/lib/utils";
import { requireAdmin } from "@/lib/access";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";


export default async function LineupsPage() {
  await requireAdmin();
  const supabase = supabaseAdmin();

  const { data: lineups } = await supabase
    .from("lineups")
    .select("*, team:teams(*), match:matches(*, competition:competitions(*))")
    .order("updated_at", { ascending: false });

  const list = lineups ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Lineups</h1>
        <p className="text-ink-muted">Every lineup, across every match.</p>
      </div>

      <div className="flex flex-col gap-3">
        {list.length === 0 && <p className="text-ink-muted">No lineups yet — create a match first.</p>}
        {list.map((l: any) => (
          <Link key={l.id} href={`/admin/lineups/${l.id}`}>
            <Card className="flex flex-col gap-1 hover:border-amber-signal/50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-signal">
                  {l.match?.competition?.name ?? "No competition"}
                </p>
                <p className="font-semibold">{l.team?.name}</p>
                <p className="text-xs text-ink-muted">
                  {l.match ? formatMatchDate(l.match.match_date, l.match.match_time) : ""}
                </p>
              </div>
              <StatusBadge status={l.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
