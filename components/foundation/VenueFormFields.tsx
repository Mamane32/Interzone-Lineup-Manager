import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Organization, Venue } from "@/lib/types";

export default function VenueFormFields({ venue, organizations }: { venue?: Venue; organizations: Organization[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input id="name" name="name" label="Name" defaultValue={venue?.name ?? ""} required />
        <Input id="short_name" name="short_name" label="Short name" defaultValue={venue?.short_name ?? ""} />
        <Select id="organization_id" name="organization_id" label="Organization" tone="dark" defaultValue={venue?.organization_id ?? ""}>
          <option value="">None</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Input id="slug" name="slug" label="Slug (auto-generated if blank)" defaultValue={venue?.slug ?? ""} />
        <Input id="city" name="city" label="City" defaultValue={venue?.city ?? ""} />
        <Input id="country" name="country" label="Country" defaultValue={venue?.country ?? ""} />
        <Input id="address" name="address" label="Address" defaultValue={venue?.address ?? ""} className="sm:col-span-2" />
        <Input id="gps_latitude" name="gps_latitude" label="GPS latitude" type="number" step="any" defaultValue={venue?.gps_latitude ?? ""} />
        <Input id="gps_longitude" name="gps_longitude" label="GPS longitude" type="number" step="any" defaultValue={venue?.gps_longitude ?? ""} />
        <Input id="capacity" name="capacity" label="Capacity" type="number" min={0} defaultValue={venue?.capacity ?? ""} />
        <Select id="surface_type" name="surface_type" label="Surface" tone="dark" defaultValue={venue?.surface_type ?? ""}>
          <option value="">Unspecified</option>
          <option value="grass">Grass</option>
          <option value="artificial_turf">Artificial turf</option>
          <option value="hybrid">Hybrid</option>
          <option value="other">Other</option>
        </Select>
        <Input id="google_maps_url" name="google_maps_url" label="Google Maps URL" defaultValue={venue?.google_maps_url ?? ""} className="sm:col-span-2" />
        <Input id="photo_url" name="photo_url" label="Photo URL" defaultValue={venue?.photo_url ?? ""} className="sm:col-span-2" />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" name="lighting" defaultChecked={venue?.lighting ?? false} className="h-4 w-4 rounded" />
          Has floodlights
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" name="home_team_supported" defaultChecked={venue?.home_team_supported ?? true} className="h-4 w-4 rounded" />
          Can be a team&apos;s home venue
        </label>
      </div>
    </div>
  );
}
