"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireFoundationAccess, existsById } from "@/lib/foundation";
import { getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const num = (name: string) => Number(String(formData.get(name) ?? "0").trim()) || 0;
  return {
    stage_id: str("stage_id"),
    name: str("name"),
    display_order: num("display_order"),
  };
}

export async function createGroup(formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.stage_id || !fields.name) redirect("/admin/groups?error=missing-fields");
  if (!(await existsById("stages", fields.stage_id))) redirect("/admin/groups?error=not-found");

  const admin = supabaseAdmin();
  const { data, error } = await admin.from("competition_groups").insert(fields).select("id").single();
  if (error) {
    console.error("createGroup failed", error);
    redirect("/admin/groups?error=save-failed");
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "group.created", targetType: "group", targetId: data?.id ?? null, metadata: { name: fields.name } });
  }
  revalidatePath("/admin/groups");
  redirect("/admin/groups?saved=1");
}

export async function updateGroup(id: string, formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("competition_groups").select("id").eq("id", id).maybeSingle();
  if (!existing) redirect("/admin/groups?error=not-found");

  const fields = fieldsFrom(formData);
  if (!fields.stage_id || !fields.name) redirect("/admin/groups?error=missing-fields");

  const { error } = await admin.from("competition_groups").update(fields).eq("id", id);
  if (error) {
    console.error("updateGroup failed", id, error);
    redirect("/admin/groups?error=save-failed");
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "group.updated", targetType: "group", targetId: id, metadata: { name: fields.name } });
  }
  revalidatePath("/admin/groups");
  redirect("/admin/groups?saved=1");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setGroupStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("competition_groups").select("id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That group no longer exists." };

  const { error } = await admin.from("competition_groups").update({ status }).eq("id", id);
  if (error) {
    console.error("setGroupStatus failed", id, error);
    return { ok: false, error: "Could not update that group." };
  }
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: status === "archived" ? "group.archived" : "group.restored", targetType: "group", targetId: id });
  }
  revalidatePath("/admin/groups");
  return { ok: true };
}
