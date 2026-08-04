import "server-only";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CompetitionGroup, Division, FoundationStatus, Organization, Season, Stage, Venue } from "@/lib/types";

/** Only these roles may manage the Competition Foundation, per the brief. */
export async function requireFoundationAccess() {
  return requireRole(["super_admin", "admin", "competition_manager"]);
}

/**
 * Every Foundation entity (organizations, competitions, seasons, divisions,
 * stages, groups, venues) is selectable from pages outside its own
 * (matches, users, invitations, dashboard, coach profile). Revalidating
 * only the entity's own admin path — the bug found in tonight's UAT —
 * left every other consumer serving a stale Router Cache entry until a
 * hard refresh. Every Foundation mutation action must call this instead of
 * calling revalidatePath() directly, so the fix lives in one place instead
 * of needing to be repeated (and missed) per entity.
 */
export function revalidateFoundation() {
  revalidatePath("/", "layout");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Confirms a slug is actually unique before insert/update — never trusts
 * that the client-side form didn't submit a duplicate. `scope` mirrors the
 * partial unique indexes in the migration (organization-scoped for
 * competitions/venues; globally unique for organizations themselves).
 */
export async function isSlugAvailable(
  table: "organizations" | "venues" | "competitions",
  slug: string,
  opts: { organizationId?: string | null; excludeId?: string } = {}
): Promise<boolean> {
  const admin = supabaseAdmin();
  let query = admin.from(table).select("id").eq("slug", slug);

  if (table === "venues" || table === "competitions") {
    query = query.eq("organization_id", opts.organizationId ?? null);
  }
  if (opts.excludeId) {
    query = query.neq("id", opts.excludeId);
  }

  const { data } = await query.limit(1);
  return (data ?? []).length === 0;
}

const PAGE_SIZE = 20;

export type OrganizationSearchFilters = {
  q?: string;
  status?: FoundationStatus;
  country?: string;
  page?: number;
};

export async function searchOrganizations(
  filters: OrganizationSearchFilters
): Promise<{ organizations: Organization[]; total: number; page: number; pageSize: number }> {
  const admin = supabaseAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from("organizations").select("*", { count: "exact" });
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${q}%,short_name.ilike.%${q}%,slug.ilike.%${q}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.country) query = query.eq("country", filters.country);

  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);
  return { organizations: (data ?? []) as Organization[], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export type VenueSearchFilters = {
  q?: string;
  status?: FoundationStatus;
  organizationId?: string;
  city?: string;
  country?: string;
  page?: number;
};

export async function searchVenues(
  filters: VenueSearchFilters
): Promise<{ venues: Venue[]; total: number; page: number; pageSize: number }> {
  const admin = supabaseAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from("venues").select("*", { count: "exact" });
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${q}%,short_name.ilike.%${q}%,city.ilike.%${q}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.country) query = query.eq("country", filters.country);

  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);
  return { venues: (data ?? []) as Venue[], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function existsById(table: "competitions" | "seasons" | "divisions" | "stages", id: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data } = await admin.from(table).select("id").eq("id", id).maybeSingle();
  return !!data;
}

export type SeasonSearchFilters = {
  q?: string;
  status?: FoundationStatus;
  competitionId?: string;
  page?: number;
};

export async function searchSeasons(
  filters: SeasonSearchFilters
): Promise<{ seasons: Season[]; total: number; page: number; pageSize: number }> {
  const admin = supabaseAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from("seasons").select("*", { count: "exact" });
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.ilike("name", `%${q}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.competitionId) query = query.eq("competition_id", filters.competitionId);

  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);
  return { seasons: (data ?? []) as Season[], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export type DivisionSearchFilters = {
  q?: string;
  status?: FoundationStatus;
  seasonId?: string;
  page?: number;
};

export async function searchDivisions(
  filters: DivisionSearchFilters
): Promise<{ divisions: Division[]; total: number; page: number; pageSize: number }> {
  const admin = supabaseAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from("divisions").select("*", { count: "exact" });
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${q}%,abbreviation.ilike.%${q}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.seasonId) query = query.eq("season_id", filters.seasonId);

  const { data, count } = await query.order("display_order", { ascending: true }).range(from, to);
  return { divisions: (data ?? []) as Division[], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export type StageSearchFilters = {
  q?: string;
  status?: FoundationStatus;
  divisionId?: string;
  page?: number;
};

export async function searchStages(
  filters: StageSearchFilters
): Promise<{ stages: Stage[]; total: number; page: number; pageSize: number }> {
  const admin = supabaseAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from("stages").select("*", { count: "exact" });
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.ilike("name", `%${q}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.divisionId) query = query.eq("division_id", filters.divisionId);

  const { data, count } = await query.order("display_order", { ascending: true }).range(from, to);
  return { stages: (data ?? []) as Stage[], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export type GroupSearchFilters = {
  q?: string;
  status?: FoundationStatus;
  stageId?: string;
  page?: number;
};

export async function searchGroups(
  filters: GroupSearchFilters
): Promise<{ groups: CompetitionGroup[]; total: number; page: number; pageSize: number }> {
  const admin = supabaseAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from("competition_groups").select("*", { count: "exact" });
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.ilike("name", `%${q}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.stageId) query = query.eq("stage_id", filters.stageId);

  const { data, count } = await query.order("display_order", { ascending: true }).range(from, to);
  return { groups: (data ?? []) as CompetitionGroup[], total: count ?? 0, page, pageSize: PAGE_SIZE };
}
