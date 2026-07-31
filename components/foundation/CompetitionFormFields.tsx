import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Competition, Organization } from "@/lib/types";

const TYPES = [
  { value: "league", label: "League" },
  { value: "cup", label: "Cup" },
  { value: "knockout", label: "Knockout" },
  { value: "round_robin", label: "Round Robin" },
  { value: "league_playoffs", label: "League + Playoffs" },
  { value: "group_knockout", label: "Group + Knockout" },
  { value: "friendly_tournament", label: "Friendly Tournament" },
  { value: "custom", label: "Custom" },
];

export default function CompetitionFormFields({ competition, organizations }: { competition?: Competition; organizations: Organization[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id="name" name="name" label="Name" defaultValue={competition?.name ?? ""} required />
        <Input id="short_name" name="short_name" label="Short name" defaultValue={competition?.short_name ?? ""} />
        <Select id="organization_id" name="organization_id" label="Organization" tone="dark" defaultValue={competition?.organization_id ?? ""}>
          <option value="">None</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </Select>
        <Input id="slug" name="slug" label="Slug (auto-generated if blank)" defaultValue={competition?.slug ?? ""} />
        <Input id="logo_url" name="logo_url" label="Logo URL" defaultValue={competition?.logo_url ?? ""} placeholder="https://..." className="sm:col-span-2" />
      </div>

      <fieldset className="rounded-xl border border-white/[0.08] p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-white/35">Classification</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select id="competition_type" name="competition_type" label="Type" tone="dark" defaultValue={competition?.competition_type ?? ""}>
            <option value="">Unspecified</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select id="gender" name="gender" label="Gender" tone="dark" defaultValue={competition?.gender ?? ""}>
            <option value="">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="mixed">Mixed</option>
            <option value="open">Open</option>
          </Select>
          <Input id="age_category" name="age_category" label="Age category" defaultValue={competition?.age_category ?? ""} placeholder="Senior, U17..." />
          <Input id="timezone" name="timezone" label="Timezone" defaultValue={competition?.timezone ?? ""} placeholder="America/Port-au-Prince" />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-white/[0.08] p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-white/35">Match format</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input id="match_duration" name="match_duration" label="Match minutes" type="number" defaultValue={competition?.match_duration ?? 90} />
          <Input id="halftime_duration" name="halftime_duration" label="Half-time minutes" type="number" defaultValue={competition?.halftime_duration ?? 15} />
          <span />
          <Input id="points_win" name="points_win" label="Points — win" type="number" defaultValue={competition?.points_win ?? 3} />
          <Input id="points_draw" name="points_draw" label="Points — draw" type="number" defaultValue={competition?.points_draw ?? 1} />
          <Input id="points_loss" name="points_loss" label="Points — loss" type="number" defaultValue={competition?.points_loss ?? 0} />
        </div>
        <div className="mt-3 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-white/45">
            <input type="checkbox" name="extra_time_enabled" defaultChecked={competition?.extra_time_enabled ?? false} className="h-4 w-4 rounded" />
            Extra time
          </label>
          <label className="flex items-center gap-2 text-sm text-white/45">
            <input type="checkbox" name="penalties_enabled" defaultChecked={competition?.penalties_enabled ?? false} className="h-4 w-4 rounded" />
            Penalties
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-white/45">Description</span>
        <textarea
          name="description"
          defaultValue={competition?.description ?? ""}
          rows={2}
          className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-white transition-colors focus:border-brand-400/60 focus:bg-white/[0.05] focus:outline-none"
        />
      </label>
    </div>
  );
}
