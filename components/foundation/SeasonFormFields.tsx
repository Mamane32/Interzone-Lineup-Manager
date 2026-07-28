import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Competition, Season } from "@/lib/types";

export default function SeasonFormFields({ season, competitions }: { season?: Season; competitions: Competition[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select id="competition_id" name="competition_id" label="Competition" tone="dark" defaultValue={season?.competition_id ?? ""} required>
        <option value="">Select competition</option>
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input id="name" name="name" label="Name" defaultValue={season?.name ?? ""} placeholder="2026 Season" required />
      <Input id="year" name="year" label="Year" type="number" defaultValue={season?.year ?? ""} />
      <span />
      <Input id="registration_start" name="registration_start" label="Registration opens" type="date" defaultValue={season?.registration_start ?? ""} />
      <Input id="registration_end" name="registration_end" label="Registration closes" type="date" defaultValue={season?.registration_end ?? ""} />
      <Input id="season_start" name="season_start" label="Season starts" type="date" defaultValue={season?.season_start ?? ""} />
      <Input id="season_end" name="season_end" label="Season ends" type="date" defaultValue={season?.season_end ?? ""} />
    </div>
  );
}
