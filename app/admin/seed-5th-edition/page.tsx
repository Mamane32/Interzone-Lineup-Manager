import { AlertTriangle, CheckCircle2, DatabaseZap } from "lucide-react";
import { requireRole } from "@/lib/access";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { runSeed } from "./actions";

export const dynamic = "force-dynamic";

export default async function SeedFifthEditionPage({
  searchParams,
}: {
  searchParams: { done?: string; error?: string; teams?: string; created?: string; updated?: string };
}) {
  await requireRole(["super_admin"]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="One-off data entry"
        title="Seed: 5th Edition — Interzone Nord'Ouest"
        description="Creates (or updates) the real competition, 3 groups, 15 teams, and the 30 group-stage fixtures with the 6 results known so far."
      />

      {searchParams.done && (
        <p className="flex items-center gap-2 rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">
          <CheckCircle2 size={15} />
          Done — {searchParams.teams} teams ready, {searchParams.created} matches created, {searchParams.updated} matches updated.
        </p>
      )}
      {searchParams.error && (
        <p className="flex items-center gap-2 rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          <AlertTriangle size={15} /> Something went wrong — check the server logs for details.
        </p>
      )}

      <Card>
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-brand-400/15 bg-brand-400/[0.07] text-brand-400">
            <DatabaseZap size={20} />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-base font-semibold">What this does</h2>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-white/50">
              <li>• Organization: Ligue Football De Port-de-Paix</li>
              <li>• Competition: Championnat Interzone Du Nord&apos;Ouest — Coupe Rock Clavaroche (5è Edisyon 2026)</li>
              <li>• Groupe A, B, C — 5 teams each, 15 total</li>
              <li>• 30 group-stage fixtures (24 Jiyè – 24 Out 2026), 6 with real results already recorded</li>
            </ul>
            <p className="mt-4 text-sm text-white/40">
              Safe to run more than once — every insert is checked against what already exists, so re-running this updates scores in place
              instead of duplicating anything.
            </p>
            <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/35">
              Not included: quarterfinal, semifinal, and final matches — their participants aren&apos;t real teams yet (each is a group
              winner/runner-up/best-3rd-place, only known once that group&apos;s 10 matches finish). The public Bracket page resolves those
              automatically from live standings; once a group is complete, create the real fixture from Admin → Matches like any other match.
            </p>
            <p className="mt-3 text-xs text-white/35">
              Coach contact info for these 15 teams isn&apos;t known yet — each one gets an obvious placeholder (&quot;Kòch a konfime&quot;,
              a @interzone.local email). Update it from Admin → Teams once a real coach is confirmed.
            </p>
            <form action={runSeed} className="mt-5">
              <Button type="submit">Run seed</Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
