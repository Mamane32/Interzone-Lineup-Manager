"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { PLAYER_POSITIONS, PREFERRED_FEET } from "@/lib/validation";
import { addPlayer } from "@/app/team/[token]/(coach)/roster/actions";

export default function AddPlayerForm({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addPlayer(token, formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-status-submitted/10 text-status-submitted">
          <UserPlus size={17} />
        </span>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink/60">Add Player</h2>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Input name="number" type="number" min={1} label="Number *" placeholder="00" required tone="light" className="text-center" />
          <div className="col-span-2">
            <Input id="full_name" name="full_name" label="Full name *" placeholder="Enter player full name" required tone="light" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select name="position" tone="light" label="Position (optional)" defaultValue="">
            <option value="">— None —</option>
            {PLAYER_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select name="preferred_foot" tone="light" label="Preferred foot (optional)" defaultValue="">
            <option value="">— None —</option>
            {PREFERRED_FEET.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2.5 text-sm font-medium text-ink/70">
          <input
            type="checkbox"
            name="is_captain"
            className="h-4.5 w-4.5 rounded border-2 border-coach-line text-status-submitted focus:ring-status-submitted/30"
          />
          Default captain
        </label>

        {error && <p className="rounded-lg bg-status-correction/10 p-3 text-sm font-medium text-status-correction">{error}</p>}

        <Button type="submit" variant="coach" size="lg" disabled={pending} className="w-full">
          <UserPlus size={17} /> {pending ? "Adding..." : "Add Player"}
        </Button>
      </form>
    </div>
  );
}
