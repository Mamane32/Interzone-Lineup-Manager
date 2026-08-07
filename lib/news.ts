import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** The News Center's admin-side shape — every column, draft or published. app/media (the "media" role's real workspace, replacing its old ComingSoonWorkspace stub) is the only caller. */
export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  category: string;
  featured: boolean;
  status: "draft" | "published";
  competitionId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  category: string;
  featured: boolean;
  status: "draft" | "published";
  competition_id: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function toNewsArticle(r: Row): NewsArticle {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    body: r.body,
    coverImageUrl: r.cover_image_url,
    category: r.category,
    featured: r.featured,
    status: r.status,
    competitionId: r.competition_id,
    authorName: r.author_name,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Every article, newest-first — app/media's article list. */
export async function listNewsArticles(): Promise<NewsArticle[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("news_articles").select("*").order("created_at", { ascending: false });
  return ((data ?? []) as Row[]).map(toNewsArticle);
}

export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("news_articles").select("*").eq("id", id).maybeSingle();
  return data ? toNewsArticle(data as Row) : null;
}

/**
 * A URL-safe slug from a title, with a short random suffix so two
 * articles titled the same way never collide — simpler than a
 * retry-on-conflict loop or lib/foundation.ts's isSlugAvailable() check
 * (which is scoped for organization-relative uniqueness; news_articles'
 * slug is globally unique with no such scope). Deliberately not a reuse
 * of lib/foundation.ts's own slugify(): that one doesn't strip
 * diacritics, which matters more here since article titles are
 * free-form Creole/French text far more likely to contain accented
 * characters than a team or venue name.
 */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é -> e, etc.)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${suffix}` : suffix;
}
