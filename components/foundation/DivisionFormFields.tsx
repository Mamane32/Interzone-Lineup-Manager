import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Division, Season } from "@/lib/types";

export default function DivisionFormFields({ division, seasons }: { division?: Division; seasons: Season[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select id="season_id" name="season_id" label="Season" tone="dark" defaultValue={division?.season_id ?? ""} required>
        <option value="">Select season</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Input id="name" name="name" label="Name" defaultValue={division?.name ?? ""} placeholder="Senior" required />
      <Input id="abbreviation" name="abbreviation" label="Abbreviation" defaultValue={division?.abbreviation ?? ""} placeholder="SR" />
      <Input id="display_order" name="display_order" label="Display order" type="number" defaultValue={division?.display_order ?? 0} />
    </div>
  );
}
