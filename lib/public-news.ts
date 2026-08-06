import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * News Center's public read model — same public-DTO discipline as
 * lib/public-match.ts/lib/public-scores.ts: `status = "published"` only
 * (a draft is never visible outside app/media), never `createdBy` (an
 * internal user id).
 */

export type PublicNewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string;
  featured: boolean;
  authorName: string | null;
  publishedAt: string;
  competitionName: string | null;
};

export type PublicNewsArticleDetail = PublicNewsArticle & { body: string };

const LIST_SELECT = `id, slug, title, excerpt, cover_image_url, category, featured, published_at, author_name, competition:competitions(name)`;

type ListRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  featured: boolean;
  published_at: string | null;
  author_name: string | null;
  competition: { name: string } | null;
};

function toPublicArticle(r: ListRow): PublicNewsArticle {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverImageUrl: r.cover_image_url,
    category: r.category,
    featured: r.featured,
    authorName: r.author_name,
    publishedAt: r.published_at ?? "",
    competitionName: r.competition?.name ?? null,
  };
}

/** Published articles, newest first — the News Center hub's main feed. Filterable by category and/or competition (Phase 4's "Categories"); `featuredOnly` powers the hub's Featured Stories rail. */
export async function listPublicNews(filters: { category?: string; competitionId?: string; featuredOnly?: boolean; limit?: number } = {}): Promise<PublicNewsArticle[]> {
  const supabase = supabaseAdmin();
  let query = supabase.from("news_articles").select(LIST_SELECT).eq("status", "published").order("published_at", { ascending: false });
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.competitionId) query = query.eq("competition_id", filters.competitionId);
  if (filters.featuredOnly) query = query.eq("featured", true);
  if (filters.limit) query = query.limit(filters.limit);
  const { data } = await query;
  return ((data ?? []) as unknown as ListRow[]).map(toPublicArticle);
}

/** One article's full body, for the reader page — null for a draft or a slug that doesn't exist, same "just 404" contract getPublicMatchView already established. */
export async function getPublicNewsBySlug(slug: string): Promise<PublicNewsArticleDetail | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("news_articles").select(`${LIST_SELECT}, body`).eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return null;
  const row = data as unknown as ListRow & { body: string };
  return { ...toPublicArticle(row), body: row.body };
}

/** Title/excerpt search — same plain-filter approach searchPublicMatches (lib/public-scores.ts) already uses, for the same reason (small dataset, no full-text index needed yet). */
export async function searchPublicNews(query: string): Promise<PublicNewsArticle[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("news_articles").select(LIST_SELECT).eq("status", "published").order("published_at", { ascending: false }).limit(50);
  const needle = trimmed.toLowerCase();
  return ((data ?? []) as unknown as ListRow[])
    .filter((r) => r.title.toLowerCase().includes(needle) || r.excerpt?.toLowerCase().includes(needle))
    .map(toPublicArticle);
}
