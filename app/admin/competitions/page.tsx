import { supabaseAdmin } from "@/lib/supabase-admin";
import { createCompetition, renameCompetition, deleteCompetition } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { Competition } from "@/lib/types";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";


export default async function CompetitionsPage() {
  const supabase = supabaseAdmin();
  const { data: competitions } = await supabase
    .from("competitions")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (competitions ?? []) as Competition[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Competitions</h1>
        <p className="text-ink-muted">Group matches and teams under a competition.</p>
      </div>

      <Card className="max-w-md">
        <form action={createCompetition} className="flex items-end gap-3">
          <Input id="name" name="name" label="New competition" placeholder="e.g. Coupe Interzone 2026" required className="flex-1" />
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {list.length === 0 && <p className="text-ink-muted">No competitions yet.</p>}
        {list.map((c) => (
          <Card key={c.id} className="max-w-xl">
            <form action={renameCompetition.bind(null, c.id)} className="flex items-end gap-3">
              <Input id={`name-${c.id}`} name="name" defaultValue={c.name} className="flex-1" />
              <Button type="submit" variant="secondary">
                Save
              </Button>
              <Button formAction={deleteCompetition.bind(null, c.id)} variant="danger">
                Delete
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
