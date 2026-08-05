"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, requireRole, getSessionUser } from "@/lib/access";
import { recordAuditEvent } from "@/lib/audit";
import { uploadImage, ASSET_CATEGORIES, type ImageUploadResult } from "@/lib/image-upload";

export async function uploadUserAvatar(formData: FormData): Promise<ImageUploadResult> {
  await requireAdmin();
  const actor = await getSessionUser();
  return uploadImage(ASSET_CATEGORIES.UserAvatar, formData.get("file") as File | null, actor?.id);
}

/** Platform branding (Settings → Platform branding) is super_admin-only —
 * it's not scoped to one organization or competition, it's the identity of
 * the whole product, so a regular admin can view it here but only a
 * super_admin can change it. */
export async function uploadOrgLogo(formData: FormData): Promise<ImageUploadResult> {
  await requireRole(["super_admin"]);
  return uploadImage(ASSET_CATEGORIES.OrganizationLogo, formData.get("file") as File | null);
}

export async function updatePlatformBranding(formData: FormData) {
  await requireRole(["super_admin"]);
  const actor = await getSessionUser();

  const organization_name = String(formData.get("organization_name") ?? "").trim();
  const organization_subtitle = String(formData.get("organization_subtitle") ?? "").trim();
  const organization_logo_url = String(formData.get("organization_logo_url") ?? "").trim() || null;
  const primary_color = String(formData.get("primary_color") ?? "").trim();
  const secondary_color = String(formData.get("secondary_color") ?? "").trim();

  if (!organization_name) {
    redirect("/admin/settings?error=brand-name-required#platform-branding");
  }

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("platform_branding")
    .update({
      organization_name,
      organization_subtitle: organization_subtitle || "Sports Platform",
      organization_logo_url,
      primary_color: primary_color || "#f5a623",
      secondary_color: secondary_color || "#0d1117",
    })
    .eq("id", true);

  if (error) {
    console.error("updatePlatformBranding failed", error);
    redirect("/admin/settings?error=brand-save-failed#platform-branding");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "platform.branding_updated",
      targetType: "platform",
      targetId: "platform_branding",
      metadata: { organization_name, organization_subtitle },
    });
  }

  // Every shell (admin, coach, Broadcast Control Center) and the login page
  // read the platform's name/logo/colors — a rename or logo swap has to
  // show up everywhere immediately, not just on this settings page.
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=branding#platform-branding");
}

export async function updateOwnProfile(formData: FormData) {
  await requireAdmin();
  const actor = await getSessionUser();
  if (!actor) redirect("/login");

  const full_name = String(formData.get("full_name") ?? "").trim() || null;
  const avatar_url = String(formData.get("avatar_url") ?? "").trim() || null;

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update({ full_name, avatar_url }).eq("id", actor.id);

  if (error) {
    console.error("updateOwnProfile failed", actor.id, error);
    redirect("/admin/settings?error=save-failed");
  }

  await recordAuditEvent({
    actorUserId: actor.id,
    action: "user.profile_updated",
    targetType: "user",
    targetId: actor.id,
    metadata: { full_name, self: true },
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=profile");
}

export async function changeOwnPassword(formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) redirect("/admin/settings?error=short#security");
  if (password !== confirm) redirect("/admin/settings?error=mismatch#security");

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("changeOwnPassword failed", error);
    redirect("/admin/settings?error=password-failed#security");
  }

  const actor = await getSessionUser();
  if (actor) {
    await recordAuditEvent({ actorUserId: actor.id, action: "user.password_changed", targetType: "user", targetId: actor.id, metadata: { self: true } });
  }

  redirect("/admin/settings?saved=password#security");
}
