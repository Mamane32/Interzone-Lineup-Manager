"use server";

import { redirect } from "next/navigation";
import { requireFoundationAccess, slugify, isSlugAvailable, revalidateFoundation } from "@/lib/foundation";
import { getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { CompetitionGender, CompetitionType } from "@/lib/types";

const COMPETITION_TYPES: CompetitionType[] = [
  "league",
  "cup",
  "knockout",
  "round_robin",
  "league_playoffs",
  "group_knockout",
  "friendly_tournament",
  "custom",
];
const GENDERS: CompetitionGender[] = ["male", "female", "mixed", "open"];

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const num = (name: string, fallback: number) => {
    const v = String(formData.get(name) ?? "").trim();
    return v ? Number(v) : fallback;
  };
  const typeInput = String(formData.get("competition_type") ?? "");
  const genderInput = String(formData.get("gender") ?? "");

  return {
    name: str("name"),
    organization_id: str("organization_id"),
    short_name: str("short_name"),
    slug: str("slug"),
    description: str("description"),
    logo_url: str("logo_url"),
    competition_type: (COMPETITION_TYPES as string[]).includes(typeInput) ? (typeInput as CompetitionType) : null,
    gender: (GENDERS as string[]).includes(genderInput) ? (genderInput as CompetitionGender) : null,
    age_category: str("age_category"),
    timezone: str("timezone"),
    match_duration: num("match_duration", 90),
    halftime_duration: num("halftime_duration", 15),
    extra_time_enabled: formData.get("extra_time_enabled") === "on",
    penalties_enabled: formData.get("penalties_enabled") === "on",
    points_win: num("points_win", 3),
    points_draw: num("points_draw", 1),
    points_loss: num("points_loss", 0),
  };
}

export async function createCompetition(formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.name) redirect("/admin/competitions?error=missing-name");

  const slug = fields.slug ? slugify(fields.slug) : slugify(fields.name!);
  if (slug && !(await isSlugAvailable("competitions", slug, { organizationId: fields.organization_id }))) {
    redirect("/admin/competitions?error=duplicate-slug");
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("competitions")
    .insert({ ...fields, slug: slug || null })
    .select("id")
    .single();

  if (error) {
    console.error("createCompetition failed", error);
    redirect("/admin/competitions?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "competition.created",
      targetType: "competition",
      targetId: data?.id ?? null,
      metadata: { name: fields.name, slug },
    });
  }

  revalidateFoundation();
  redirect("/admin/competitions?saved=1");
}

export async function renameCompetition(id: string, formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.name) redirect("/admin/competitions?error=missing-name");

  const slug = fields.slug ? slugify(fields.slug) : slugify(fields.name!);
  if (slug && !(await isSlugAvailable("competitions", slug, { organizationId: fields.organization_id, excludeId: id }))) {
    redirect("/admin/competitions?error=duplicate-slug");
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("competitions")
    .update({ ...fields, slug: slug || null })
    .eq("id", id);

  if (error) {
    console.error("renameCompetition failed", id, error);
    redirect("/admin/competitions?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "competition.updated",
      targetType: "competition",
      targetId: id,
      metadata: { name: fields.name },
    });
  }

  revalidateFoundation();
  redirect("/admin/competitions?saved=1");
}

export async function deleteCompetition(id: string) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const supabase = supabaseAdmin();
  await supabase.from("competitions").delete().eq("id", id);

  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "competition.deleted", targetType: "competition", targetId: id });
  }

  revalidateFoundation();
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setCompetitionStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const supabase = supabaseAdmin();
  const { data: existing } = await supabase.from("competitions").select("id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That competition no longer exists." };

  const { error } = await supabase.from("competitions").update({ status }).eq("id", id);
  if (error) {
    console.error("setCompetitionStatus failed", id, error);
    return { ok: false, error: "Could not update that competition." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: status === "archived" ? "competition.archived" : "competition.restored",
      targetType: "competition",
      targetId: id,
      metadata: { status },
    });
  }

  revalidateFoundation();
  return { ok: true };
}
