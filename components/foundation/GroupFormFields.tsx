import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { CompetitionGroup, Stage } from "@/lib/types";

export default function GroupFormFields({ group, stages }: { group?: CompetitionGroup; stages: Stage[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select id="stage_id" name="stage_id" label="Stage" tone="dark" defaultValue={group?.stage_id ?? ""} required>
        <option value="">Select stage</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </Select>
      <Input id="name" name="name" label="Name" defaultValue={group?.name ?? ""} placeholder="Group A" required />
      <Input id="display_order" name="display_order" label="Display order" type="number" defaultValue={group?.display_order ?? 0} />
    </div>
  );
}
