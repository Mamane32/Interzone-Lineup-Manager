"use server";

import { redirect } from "next/navigation";
import { requireFoundationAccess, existsById, revalidateFoundation } from "@/lib/foundation";
import { getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { StageType } from "@/lib/types";

const STAGE_TYPES: StageType[] = ["regular_season", "group_stage", "knockout", "quarterfinal", "semifinal", "third_place", "final", "custom"];

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const num = (name: string) => Number(String(formData.get(name) ?? "0").trim()) || 0;
  const typeInput = String(formData.get("stage_type") ?? "");
  return {
    division_id: str("division_id"),
    name: str("name"),
    stage_type: (STAGE_TYPES as string[]).includes(typeInput) ? (typeInput as StageType) : null,
    display_order: num("display_order"),
  };
}

export async function createStage(formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.division_id || !fields.name) redirect("/admin/stages?error=missing-fields");
  if (!(await existsById("divisions", fields.division_id))) redirect("/admin/stages?error=not-found");

  const admin = supabaseAdmin();
  const { data, error } = await admin.from("stages").insert(fields).select("id").single();
  if (error) {
    console.error("createStage failed", error);
    redirect("/admin/stages?error=save-failed");
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "stage.created", targetType: "stage", targetId: data?.id ?? null, metadata: { name: fields.name } });
  }
  revalidateFoundation();
  redirect("/admin/stages?saved=1");
}

export async function updateStage(id: string, formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("stages").select("id").eq("id", id).maybeSingle();
  if (!existing) redirect("/admin/stages?error=not-found");

  const fields = fieldsFrom(formData);
  if (!fields.division_id || !fields.name) redirect("/admin/stages?error=missing-fields");

  const { error } = await admin.from("stages").update(fields).eq("id", id);
  if (error) {
    console.error("updateStage failed", id, error);
    redirect("/admin/stages?error=save-failed");
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "stage.updated", targetType: "stage", targetId: id, metadata: { name: fields.name } });
  }
  revalidateFoundation();
  redirect("/admin/stages?saved=1");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setStageStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("stages").select("id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That stage no longer exists." };

  const { error } = await admin.from("stages").update({ status }).eq("id", id);
  if (error) {
    console.error("setStageStatus failed", id, error);
    return { ok: false, error: "Could not update that stage." };
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: status === "archived" ? "stage.archived" : "stage.restored", targetType: "stage", targetId: id });
  }
  revalidateFoundation();
  return { ok: true };
}
