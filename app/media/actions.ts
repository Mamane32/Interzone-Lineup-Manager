"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { uploadImage, ASSET_CATEGORIES, type ImageUploadResult } from "@/lib/image-upload";
import { slugify } from "@/lib/news";
import { NEWS_CATEGORIES } from "@/lib/news-categories";

/** Every public GGScoreLive path that could render news content, plus the admin list itself. */
function revalidateNews() {
  revalidatePath("/media");
  revalidatePath("/scores/news", "layout");
  revalidatePath("/scores", "layout");
}

function fieldsFrom(formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const categoryInput = String(formData.get("category") ?? "general");
  return {
    title: str("title"),
    excerpt: str("excerpt"),
    body: String(formData.get("body") ?? ""),
    cover_image_url: str("coverImageUrl"),
    category: NEWS_CATEGORIES.some((c) => c.id === categoryInput) ? categoryInput : "general",
    competition_id: str("competitionId"),
    author_name: str("authorName"),
    featured: formData.get("featured") === "on",
  };
}

export async function uploadNewsCoverImage(formData: FormData): Promise<ImageUploadResult> {
  await requireRole(["media", "admin", "super_admin"]);
  const file = formData.get("file") as File | null;
  return uploadImage(ASSET_CATEGORIES.NewsArticle, file);
}

export async function createNewsArticle(formData: FormData) {
  const { userId } = await requireRole(["media", "admin", "super_admin"]);
  const fields = fieldsFrom(formData);
  if (!fields.title) redirect("/media?error=missing-title");

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("news_articles")
    .insert({ ...fields, slug: slugify(fields.title!), created_by: userId })
    .select("id")
    .single();

  if (error) {
    console.error("createNewsArticle failed", error);
    redirect("/media?error=save-failed");
  }

  await recordAuditEvent({ actorUserId: userId, action: "news_article.created", targetType: "news_article", targetId: data.id, metadata: { title: fields.title } });
  revalidateNews();
  redirect("/media?saved=1");
}

export async function updateNewsArticle(id: string, formData: FormData) {
  const { userId } = await requireRole(["media", "admin", "super_admin"]);
  const fields = fieldsFrom(formData);
  if (!fields.title) redirect("/media?error=missing-title");

  const admin = supabaseAdmin();
  const { error } = await admin.from("news_articles").update(fields).eq("id", id);
  if (error) {
    console.error("updateNewsArticle failed", id, error);
    redirect("/media?error=save-failed");
  }

  await recordAuditEvent({ actorUserId: userId, action: "news_article.updated", targetType: "news_article", targetId: id, metadata: { title: fields.title } });
  revalidateNews();
  redirect("/media?saved=1");
}

/** Publishing sets published_at only the first time (a null -> "published" transition) — republishing after an edit doesn't reset the article's original publish date, matching ordinary CMS behavior. */
export async function setNewsArticleStatus(id: string, status: "draft" | "published") {
  const { userId } = await requireRole(["media", "admin", "super_admin"]);
  const admin = supabaseAdmin();

  const patch: Record<string, unknown> = { status };
  if (status === "published") {
    const { data: existing } = await admin.from("news_articles").select("published_at").eq("id", id).maybeSingle();
    if (!existing?.published_at) patch.published_at = new Date().toISOString();
  }

  const { error } = await admin.from("news_articles").update(patch).eq("id", id);
  if (error) console.error("setNewsArticleStatus failed", id, error);

  await recordAuditEvent({ actorUserId: userId, action: `news_article.${status === "published" ? "published" : "unpublished"}`, targetType: "news_article", targetId: id });
  revalidateNews();
}

export async function toggleNewsArticleFeatured(id: string, featured: boolean) {
  const { userId } = await requireRole(["media", "admin", "super_admin"]);
  const admin = supabaseAdmin();
  const { error } = await admin.from("news_articles").update({ featured }).eq("id", id);
  if (error) console.error("toggleNewsArticleFeatured failed", id, error);
  await recordAuditEvent({ actorUserId: userId, action: "news_article.featured_toggled", targetType: "news_article", targetId: id, metadata: { featured } });
  revalidateNews();
}

export async function deleteNewsArticle(id: string) {
  const { userId } = await requireRole(["media", "admin", "super_admin"]);
  const admin = supabaseAdmin();
  const { error } = await admin.from("news_articles").delete().eq("id", id);
  if (error) console.error("deleteNewsArticle failed", id, error);
  await recordAuditEvent({ actorUserId: userId, action: "news_article.deleted", targetType: "news_article", targetId: id });
  revalidateNews();
}
