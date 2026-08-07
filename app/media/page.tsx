import { requireRole, getProfile } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { listNewsArticles } from "@/lib/news";
import AppShell, { type ShellNavGroup } from "@/components/shell/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import NewsExplorer from "@/components/media/NewsExplorer";
import { Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

const NAVIGATION: ShellNavGroup[] = [
  { label: "News Center", items: [{ href: "/media", label: "Articles", icon: Newspaper }] },
];

/**
 * The "media" role's real workspace — GGScoreLive's News Center authoring
 * surface (Sprint 4 Phase 4), replacing the ComingSoonWorkspace stub this
 * route rendered before. Everything here writes to news_articles
 * (migration 033); the public reading side lives at /scores/news and
 * reads only `status = "published"` rows via lib/public-news.ts.
 */
export default async function MediaPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const { userId } = await requireRole(["media", "admin", "super_admin"]);
  const profile = await getProfile(userId);

  const supabase = supabaseAdmin();
  const [articles, { data: competitions }] = await Promise.all([listNewsArticles(), supabase.from("competitions").select("id, name").order("name")]);

  return (
    <AppShell nav={NAVIGATION} workspaceLabel="Media Workspace" user={{ name: profile?.full_name || "Media", email: profile?.email || "", role: "Media" }}>
      <PageHeader eyebrow="News Center" title="Articles" description="Write, publish, and feature GGScoreLive's news content." />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>}
      {searchParams.error && <p className="mb-4 rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">Something went wrong. Please try again.</p>}
      <NewsExplorer articles={articles} competitions={(competitions ?? []) as { id: string; name: string }[]} />
    </AppShell>
  );
}
