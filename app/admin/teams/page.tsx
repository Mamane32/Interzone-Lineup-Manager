import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createTeam } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { teamLink } from "@/lib/utils";
import type { Team, Competition } from "@/lib/types";
import { requireAdmin } from "@/lib/access";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";


export default async function TeamsPage() {
  await requireAdmin();
  const supabase = supabaseAdmin();
  const [{ data: teams }, { data: competitions }] = await Promise.all([
    supabase.from("teams").select("*").order("created_at", { ascending: false }),
    supabase.from("competitions").select("*").order("name"),
  ]);

  const teamList = (teams ?? []) as Team[];
  const competitionList = (competitions ?? []) as Competition[];
  const competitionName = new Map(competitionList.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Teams</h1>
        <p className="text-ink-muted">Create each team once. A private coach link is generated automatically.</p>
      </div>

      <Card className="max-w-2xl">
        <h2 className="mb-4 font-display text-lg font-semibold">Add team</h2>
        <form action={createTeam} className="grid gap-4 sm:grid-cols-2" encType="multipart/form-data">
          <Input id="name" name="name" label="Team name" required />
          <Select id="competition_id" name="competition_id" label="Competition" tone="dark">
            <option value="">— None —</option>
            {competitionList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input id="coach_name" name="coach_name" label="Coach name" required />
          <Input id="coach_phone" name="coach_phone" label="Coach telephone" required />
          <Input id="coach_email" name="coach_email" label="Coach email (used for Coach Portal login)" type="email" required />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="logo" className="text-sm font-medium text-ink-muted">
              Team logo (PNG)
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png"
              className="text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
            />
          </div>
          <Button type="submit" className="sm:col-span-2 mt-2">
            Create team
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {teamList.length === 0 && <p className="text-ink-muted">No teams yet.</p>}
        {teamList.map((t) => (
          <Card key={t.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {t.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/10" />
              )}
              <div>
                <Link href={`/admin/teams/${t.id}`} className="font-semibold hover:text-amber-signal">
                  {t.name}
                </Link>
                <p className="text-xs text-ink-muted">
                  {t.coach_name} · {t.coach_phone}
                  {t.competition_id ? ` · ${competitionName.get(t.competition_id) ?? ""}` : ""}
                </p>
              </div>
            </div>
            <CopyLinkButton link={teamLink(t.token)} teamName={t.name} />
          </Card>
        ))}
      </div>
    </div>
  );
}
