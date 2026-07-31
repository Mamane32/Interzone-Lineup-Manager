"use server";

import { redirect } from "next/navigation";
import { requireFoundationAccess, existsById, revalidateFoundation } from "@/lib/foundation";
import { getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const num = (name: string) => Number(String(formData.get(name) ?? "0").trim()) || 0;
  return {
    season_id: str("season_id"),
    name: str("name"),
    abbreviation: str("abbreviation"),
    display_order: num("display_order"),
  };
}

export async function createDivision(formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.season_id || !fields.name) redirect("/admin/divisions?error=missing-fields");
  if (!(await existsById("seasons", fields.season_id))) redirect("/admin/divisions?error=not-found");

  const admin = supabaseAdmin();
  const { data, error } = await admin.from("divisions").insert(fields).select("id").single();
  if (error) {
    console.error("createDivision failed", error);
    redirect("/admin/divisions?error=save-failed");
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "division.created", targetType: "division", targetId: data?.id ?? null, metadata: { name: fields.name } });
  }
  revalidateFoundation();
  redirect("/admin/divisions?saved=1");
}

export async function updateDivision(id: string, formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("divisions").select("id").eq("id", id).maybeSingle();
  if (!existing) redirect("/admin/divisions?error=not-found");

  const fields = fieldsFrom(formData);
  if (!fields.season_id || !fields.name) redirect("/admin/divisions?error=missing-fields");

  const { error } = await admin.from("divisions").update(fields).eq("id", id);
  if (error) {
    console.error("updateDivision failed", id, error);
    redirect("/admin/divisions?error=save-failed");
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "division.updated", targetType: "division", targetId: id, metadata: { name: fields.name } });
  }
  revalidateFoundation();
  redirect("/admin/divisions?saved=1");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setDivisionStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("divisions").select("id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That division no longer exists." };

  const { error } = await admin.from("divisions").update({ status }).eq("id", id);
  if (error) {
    console.error("setDivisionStatus failed", id, error);
    return { ok: false, error: "Could not update that division." };
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: status === "archived" ? "division.archived" : "division.restored", targetType: "division", targetId: id });
  }
  revalidateFoundation();
  return { ok: true };
}
