import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { updateTeam, deleteTeam, uploadTeamLogo } from "../actions";
import { addPlayer, updatePlayer, deletePlayer, inviteCoach } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ImageUpload from "@/components/ui/ImageUpload";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import { teamLink } from "@/lib/utils";
import type { Team, Competition, Player } from "@/lib/types";
import { requireAdmin } from "@/lib/access";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";

const INVITE_MESSAGES: Record<string, { text: string; tone: "ok" | "error" }> = {
  sent: { text: "Invite email sent to the coach.", tone: "ok" },
  failed: { text: "Could not send the invite — check the email address and try again.", tone: "error" },
  "missing-email": { text: "Add a coach email above before sending an invite.", tone: "error" },
};

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { invite?: string };
}) {
  await requireAdmin();
  const supabase = supabaseAdmin();

  const [{ data: team }, { data: competitions }, { data: players }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", params.id).single(),
    supabase.from("competitions").select("*").order("name"),
    supabase.from("players").select("*").eq("team_id", params.id).order("number"),
  ]);

  if (!team) notFound();

  const t = team as Team;
  const competitionList = (competitions ?? []) as Competition[];
  const playerList = (players ?? []) as Player[];
  const inviteMessage = searchParams.invite ? INVITE_MESSAGES[searchParams.invite] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t.name}</h1>
        <p className="text-white/40">Team details and squad list.</p>
      </div>

      <Card className="max-w-2xl">
        <h2 className="mb-4 font-display text-lg font-semibold">Team info</h2>
        <form action={updateTeam.bind(null, t.id)} className="grid gap-4 sm:grid-cols-2">
          <Input id="name" name="name" label="Team name" defaultValue={t.name} required />
          <Select id="competition_id" name="competition_id" label="Competition" tone="dark" defaultValue={t.competition_id ?? ""}>
            <option value="">— None —</option>
            {competitionList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input id="coach_name" name="coach_name" label="Coach name" defaultValue={t.coach_name} required />
          <Input id="coach_phone" name="coach_phone" label="Coach telephone" defaultValue={t.coach_phone} required />
          <Input
            id="coach_email"
            name="coach_email"
            label="Coach email (used for Coach Portal login)"
            type="email"
            defaultValue={t.coach_email ?? ""}
            required
          />
          <ImageUpload label="Team logo" name="logo_url" currentUrl={t.logo_url} action={uploadTeamLogo} shape="circle" size={64} />
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit">Save changes</Button>
          </div>
        </form>
        <div className="mt-3">
          <ConfirmActionDialog
            triggerLabel="Delete team"
            triggerVariant="danger"
            title="Delete this team?"
            body={`${t.name} and its entire squad list will be permanently removed. This cannot be undone.`}
            confirmLabel="Delete permanently"
            action={deleteTeam.bind(null, t.id)}
          />
        </div>

        <div className="mt-6 border-t border-white/[0.08] pt-4">
          <p className="mb-2 text-sm font-medium text-white/40">Private coach link</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-surface-950 px-3 py-2 text-sm text-brand-400">
              {teamLink(t.token)}
            </code>
            <CopyLinkButton link={teamLink(t.token)} teamName={t.name} />
          </div>
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="mb-1 font-display text-lg font-semibold">Coach Portal access</h2>
        <p className="mb-4 text-sm text-white/40">
          Sends the coach an email to set their password and sign in at{" "}
          <code className="text-brand-400">{teamLink(t.token)}</code>. Uses Supabase Auth — no
          separate account system.
        </p>
        {inviteMessage && (
          <p
            className={`mb-3 text-sm font-medium ${
              inviteMessage.tone === "ok" ? "text-status-submitted" : "text-status-correction"
            }`}
          >
            {inviteMessage.text}
          </p>
        )}
        <form action={inviteCoach.bind(null, t.id)}>
          <Button type="submit" variant="secondary">
            Send coach login invite
          </Button>
        </form>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="mb-4 font-display text-lg font-semibold">Squad list ({playerList.length})</h2>

        <form action={addPlayer.bind(null, t.id)} className="mb-4 flex items-end gap-3">
          <Input id="number" name="number" type="number" min={0} max={99} label="No." className="w-20" required />
          <Input id="full_name" name="full_name" label="Player full name" className="flex-1" required />
          <Button type="submit">Add</Button>
        </form>

        <div className="divide-y divide-white/[0.08]">
          {playerList.length === 0 && <p className="py-4 text-white/40">No players yet.</p>}
          {playerList.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2">
              <PlayerEditRow teamId={t.id} player={p} />
              <PlayerRemoveAction teamId={t.id} player={p} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PlayerEditRow({ teamId, player }: { teamId: string; player: Player }) {
  return (
    <form
      action={updatePlayer.bind(null, teamId, player.id)}
      className="flex flex-1 items-center gap-3"
    >
      <input
        name="number"
        type="number"
        min={0}
        max={99}
        defaultValue={player.number}
        className="h-10 w-16 rounded-lg border border-white/[0.08] bg-surface-950 px-2 text-white"
      />
      <input
        name="full_name"
        defaultValue={player.full_name}
        className="h-10 flex-1 rounded-lg border border-white/[0.08] bg-surface-950 px-2 text-white"
      />
      <Button type="submit" variant="secondary" size="md">
        Save
      </Button>
    </form>
  );
}

function PlayerRemoveAction({ teamId, player }: { teamId: string; player: Player }) {
  return (
    <ConfirmActionDialog
      triggerLabel="Remove"
      triggerVariant="danger"
      title="Remove this player?"
      body={`${player.full_name} will be permanently removed from the squad list. This cannot be undone.`}
      confirmLabel="Remove"
      action={deletePlayer.bind(null, teamId, player.id)}
    />
  );
}
