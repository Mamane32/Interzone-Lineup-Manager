import MasterHeader from "@/components/goodgrafik/MasterHeader";
import MasterBottomNav from "@/components/goodgrafik/MasterBottomNav";
import MasterSplash from "@/components/goodgrafik/MasterSplash";

/**
 * Shell for the GoodGrafik master platform routes — the home page plus
 * the /sports redirect and the /culture, /news, /studio world shells.
 * A route group (the parens don't affect the URL) so this nav only wraps
 * these routes: everything else (GGScoreLive's /scores/*, the admin/coach
 * portals, /match/[matchId], etc.) sits outside this group at the same
 * app/ level and is completely unaffected — its own layouts/PublicNav/
 * AppShell keep rendering exactly as before.
 */
export default function GoodGrafikLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <MasterSplash />
      <MasterHeader />
      <div className="pb-24 pt-16 md:pb-0">{children}</div>
      <MasterBottomNav />
    </div>
  );
}
