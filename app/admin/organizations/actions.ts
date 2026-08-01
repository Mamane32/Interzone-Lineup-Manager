"use server";

import { redirect } from "next/navigation";
import { requireFoundationAccess, slugify, isSlugAvailable, revalidateFoundation } from "@/lib/foundation";
import { getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { uploadImage, type ImageUploadResult } from "@/lib/image-upload";

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  return {
    name: str("name"),
    short_name: str("short_name"),
    slug: str("slug"),
    description: str("description"),
    logo_url: str("logo_url"),
    banner_url: str("banner_url"),
    primary_color: str("primary_color"),
    secondary_color: str("secondary_color"),
    country: str("country"),
    city: str("city"),
    address: str("address"),
    phone: str("phone"),
    email: str("email"),
    website: str("website"),
    timezone: str("timezone"),
    currency: str("currency"),
  };
}

export async function createOrganization(formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const fields = fieldsFrom(formData);
  if (!fields.name) redirect("/admin/organizations?error=missing-name");

  const slug = fields.slug ? slugify(fields.slug) : slugify(fields.name!);
  if (!slug) redirect("/admin/organizations?error=missing-name");
  if (!(await isSlugAvailable("organizations", slug))) {
    redirect("/admin/organizations?error=duplicate-slug");
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("organizations")
    .insert({ ...fields, slug })
    .select("id")
    .single();

  if (error) {
    console.error("createOrganization failed", error);
    redirect("/admin/organizations?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "organization.created",
      targetType: "organization",
      targetId: data?.id ?? null,
      metadata: { name: fields.name, slug },
    });
  }

  // Organizations feed the Competition create/edit dropdown among other
  // pages — revalidate the whole tree, not just this one page.
  revalidateFoundation();
  redirect("/admin/organizations?saved=1");
}

export async function updateOrganization(id: string, formData: FormData) {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("organizations").select("id").eq("id", id).maybeSingle();
  if (!existing) redirect("/admin/organizations?error=not-found");

  const fields = fieldsFrom(formData);
  if (!fields.name) redirect("/admin/organizations?error=missing-name");

  const slug = fields.slug ? slugify(fields.slug) : slugify(fields.name!);
  if (!slug) redirect("/admin/organizations?error=missing-name");
  if (!(await isSlugAvailable("organizations", slug, { excludeId: id }))) {
    redirect("/admin/organizations?error=duplicate-slug");
  }

  const { error } = await admin.from("organizations").update({ ...fields, slug }).eq("id", id);
  if (error) {
    console.error("updateOrganization failed", id, error);
    redirect("/admin/organizations?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "organization.updated",
      targetType: "organization",
      targetId: id,
      metadata: { name: fields.name, slug },
    });
  }

  revalidateFoundation();
  redirect("/admin/organizations?saved=1");
}

export async function uploadOrganizationLogo(formData: FormData): Promise<ImageUploadResult> {
  await requireFoundationAccess();
  return uploadImage("organization-logos", formData.get("file") as File | null);
}

export async function uploadOrganizationBanner(formData: FormData): Promise<ImageUploadResult> {
  await requireFoundationAccess();
  return uploadImage("organization-banners", formData.get("file") as File | null);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setOrganizationStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  await requireFoundationAccess();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("organizations").select("id").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "That organization no longer exists." };

  const { error } = await admin.from("organizations").update({ status }).eq("id", id);
  if (error) {
    console.error("setOrganizationStatus failed", id, error);
    return { ok: false, error: "Could not update that organization." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: status === "archived" ? "organization.archived" : "organization.restored",
      targetType: "organization",
      targetId: id,
      metadata: { status },
    });
  }

  revalidateFoundation();
  return { ok: true };
}
