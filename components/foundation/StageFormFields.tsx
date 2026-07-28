import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Division, Stage } from "@/lib/types";

const STAGE_TYPES = [
  { value: "regular_season", label: "Regular Season" },
  { value: "group_stage", label: "Group Stage" },
  { value: "knockout", label: "Knockout" },
  { value: "quarterfinal", label: "Quarterfinal" },
  { value: "semifinal", label: "Semifinal" },
  { value: "third_place", label: "Third Place" },
  { value: "final", label: "Final" },
  { value: "custom", label: "Custom" },
];

export default function StageFormFields({ stage, divisions }: { stage?: Stage; divisions: Division[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select id="division_id" name="division_id" label="Division" tone="dark" defaultValue={stage?.division_id ?? ""} required>
        <option value="">Select division</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </Select>
      <Input id="name" name="name" label="Name" defaultValue={stage?.name ?? ""} placeholder="Semi Finals" required />
      <Select id="stage_type" name="stage_type" label="Stage type" tone="dark" defaultValue={stage?.stage_type ?? ""}>
        <option value="">Unspecified</option>
        {STAGE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </Select>
      <Input id="display_order" name="display_order" label="Display order" type="number" defaultValue={stage?.display_order ?? 0} />
    </div>
  );
}
