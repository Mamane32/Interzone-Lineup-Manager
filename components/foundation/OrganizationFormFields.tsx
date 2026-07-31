import Input from "@/components/ui/Input";
import type { Organization } from "@/lib/types";

export default function OrganizationFormFields({ org }: { org?: Organization }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id="name" name="name" label="Name" defaultValue={org?.name ?? ""} required />
        <Input id="short_name" name="short_name" label="Short name" defaultValue={org?.short_name ?? ""} />
        <Input
          id="slug"
          name="slug"
          label="Slug (auto-generated from name if left blank)"
          defaultValue={org?.slug ?? ""}
          placeholder="interzone"
        />
        <Input id="country" name="country" label="Country" defaultValue={org?.country ?? ""} />
        <Input id="city" name="city" label="City" defaultValue={org?.city ?? ""} />
        <Input id="timezone" name="timezone" label="Timezone" defaultValue={org?.timezone ?? ""} placeholder="America/Port-au-Prince" />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-white/40">Description</span>
        <textarea
          name="description"
          defaultValue={org?.description ?? ""}
          rows={2}
          className="rounded-xl border border-white/[0.08] bg-surface-950 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
        />
      </label>

      <fieldset className="rounded-xl border border-white/[0.08] p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-white/40">Branding</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="logo_url" name="logo_url" label="Logo URL" defaultValue={org?.logo_url ?? ""} />
          <Input id="banner_url" name="banner_url" label="Banner URL" defaultValue={org?.banner_url ?? ""} />
          <Input id="primary_color" name="primary_color" label="Primary color" defaultValue={org?.primary_color ?? ""} placeholder="#0B0F14" />
          <Input id="secondary_color" name="secondary_color" label="Secondary color" defaultValue={org?.secondary_color ?? ""} placeholder="#FFB020" />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-white/[0.08] p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-white/40">Contact</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="address" name="address" label="Address" defaultValue={org?.address ?? ""} />
          <Input id="phone" name="phone" label="Phone" defaultValue={org?.phone ?? ""} />
          <Input id="email" name="email" label="Email" type="email" defaultValue={org?.email ?? ""} />
          <Input id="website" name="website" label="Website" defaultValue={org?.website ?? ""} />
          <Input id="currency" name="currency" label="Currency" defaultValue={org?.currency ?? ""} placeholder="HTG" />
        </div>
      </fieldset>
    </div>
  );
}
