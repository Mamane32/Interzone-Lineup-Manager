"use server";

import { redirect } from "next/navigation";
import { requireFoundationAccess, slugify, isSlugAvailable, revalidateFoundation } from "@/lib/foundation";
import { getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { VenueSurfaceType } from "@/lib/types";

const SURFACE_TYPES: VenueSurfaceType[] = ["grass", "artificial_turf", "hybrid", "other"];

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const num = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v ? Number(v) : null;
  };
  const surfaceInput = String(formData.get("surface_type") ?? "");

  return {
    name: str("name"),
    short_name: str("short_name"),
    slug: str("slug"),
    organization_id: str("organization_id"),
    address: str("address"),
    city: str("city"),
    country: str("country"),
    gps_latitude: num("gps_latitude"),
    gps_longitude: num("gps_longitude"),
    capacity: num("capacity"),
    surface_type: (SURFACE_TYPES as string[]).includes(surfaceInput) ? (surfaceInput as VenueSurfaceType) : null,
    lighting: formData.get("lighting") === "on",
    home_team_supported: formData.get("home_team_supported") === "on",
    google_maps_url: str("google_maps_url"),
    photo_url: str("photo_url"),
  };
}

export async function createVenue(formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.name) redirect("/admin/venues?error=missing-name");

  const slug = fields.slug ? slugify(fields.slug) : slugify(fields.name!);
  if (slug && !(await isSlugAvailable("venues", slug, { organizationId: fields.organization_id }))) {
    redirect("/admin/venues?error=duplicate-slug");
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("venues")
    .insert({ ...fields, slug: slug || null })
    .select("id")
    .single();

  if (error) {
    console.error("createVenue failed", error);
    redirect("/admin/venues?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "venue.created",
      targetType: "venue",
      targetId: data?.id ?? null,
      metadata: { name: fields.name, slug },
    });
  }

  revalidateFoundation();
  redirect("/admin/venues?saved=1");
}

export async function updateVenue(id: string, formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("venues").select("id").eq("id", id).maybeSingle();
  if (!existing) redirect("/admin/venues?error=not-found");

  const fields = fieldsFrom(formData);
  if (!fields.name) redirect("/admin/venues?error=missing-name");

  const slug = fields.slug ? slugify(fields.slug) : slugify(fields.name!);
  if (slug && !(await isSlugAvailable("venues", slug, { organizationId: fields.organization_id, excludeId: id }))) {
    redirect("/admin/venues?error=duplicate-slug");
  }

  const { error } = await admin
    .from("venues")
    .update({ ...fields, slug: slug || null })
    .eq("id", id);

  if (error) {
    console.error("updateVenue failed", id, error);
    redirect("/admin/venues?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "venue.updated",
      targetType: "venue",
      targetId: id,
      metadata: { name: fields.name, slug },
    });
  }

  revalidateFoundation();
  redirect("/admin/venues?saved=1");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setVenueStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("venues").select("id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That venue no longer exists." };

  const { error } = await admin.from("venues").update({ status }).eq("id", id);
  if (error) {
    console.error("setVenueStatus failed", id, error);
    return { ok: false, error: "Could not update that venue." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: status === "archived" ? "venue.archived" : "venue.restored",
      targetType: "venue",
      targetId: id,
      metadata: { status },
    });
  }

  revalidateFoundation();
  return { ok: true };
}
