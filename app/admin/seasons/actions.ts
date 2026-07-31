"use server";

import { redirect } from "next/navigation";
import { requireFoundationAccess, existsById, revalidateFoundation } from "@/lib/foundation";
import { getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const num = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v ? Number(v) : null;
  };
  return {
    competition_id: str("competition_id"),
    name: str("name"),
    year: num("year"),
    registration_start: str("registration_start"),
    registration_end: str("registration_end"),
    season_start: str("season_start"),
    season_end: str("season_end"),
  };
}

export async function createSeason(formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.competition_id || !fields.name) redirect("/admin/seasons?error=missing-fields");
  if (!(await existsById("competitions", fields.competition_id))) redirect("/admin/seasons?error=not-found");

  const admin = supabaseAdmin();
  const { data, error } = await admin.from("seasons").insert(fields).select("id").single();

  if (error) {
    console.error("createSeason failed", error);
    redirect("/admin/seasons?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "season.created",
      targetType: "season",
      targetId: data?.id ?? null,
      metadata: { name: fields.name, competition_id: fields.competition_id },
    });
  }

  revalidateFoundation();
  redirect("/admin/seasons?saved=1");
}

export async function updateSeason(id: string, formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("seasons").select("id").eq("id", id).maybeSingle();
  if (!existing) redirect("/admin/seasons?error=not-found");

  const fields = fieldsFrom(formData);
  if (!fields.competition_id || !fields.name) redirect("/admin/seasons?error=missing-fields");

  const { error } = await admin.from("seasons").update(fields).eq("id", id);
  if (error) {
    console.error("updateSeason failed", id, error);
    redirect("/admin/seasons?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "season.updated",
      targetType: "season",
      targetId: id,
      metadata: { name: fields.name },
    });
  }

  revalidateFoundation();
  redirect("/admin/seasons?saved=1");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function archiveSeason(id: string): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("seasons").select("id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That season no longer exists." };

  const { error } = await admin.from("seasons").update({ status: "archived" }).eq("id", id);
  if (error) {
    console.error("archiveSeason failed", id, error);
    return { ok: false, error: "Could not archive that season." };
  }

  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "season.archived", targetType: "season", targetId: id });
  }

  revalidateFoundation();
  return { ok: true };
}

/**
 * Activates a season, correctly handling "only one active season per
 * competition" — the DB has a partial unique index enforcing this, so
 * simply setting this row to 'active' would fail with a constraint
 * violation if another season for the same competition is already active.
 * This archives that one first, then activates the requested one.
 */
export async function activateSeason(id: string): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: season } = await admin.from("seasons").select("id, competition_id").eq("id", id).maybeSingle();
  if (!season) return { ok: false, error: "That season no longer exists." };

  const { error: clearError } = await admin
    .from("seasons")
    .update({ status: "archived" })
    .eq("competition_id", season.competition_id)
    .eq("status", "active")
    .neq("id", id);

  if (clearError) {
    console.error("activateSeason (clear) failed", id, clearError);
    return { ok: false, error: "Could not activate that season." };
  }

  const { error } = await admin.from("seasons").update({ status: "active" }).eq("id", id);
  if (error) {
    console.error("activateSeason failed", id, error);
    return { ok: false, error: "Could not activate that season." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "season.activated",
      targetType: "season",
      targetId: id,
      metadata: { competition_id: season.competition_id },
    });
  }

  revalidateFoundation();
  return { ok: true };
}
