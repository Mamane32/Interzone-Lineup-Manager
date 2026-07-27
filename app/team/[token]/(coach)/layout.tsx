import { requireCoach } from "@/lib/coach-auth";
import { coachLogout } from "../login/actions";
import BottomNav from "@/components/coach/BottomNav";
import { LogOut } from "lucide-react";
import { getTheme } from "@/lib/team-theme";

// Always render on request — this layout authenticates and reads live data
// via the service-role Supabase client on every request.
export const dynamic = "force-dynamic";

export default async function CoachAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { token: string };
}) {
  const { team } = await requireCoach(params.token);
  const theme = getTheme(team.name);

  return (
    <div className="min-h-screen bg-coach-bg pb-24">
      <header className="sticky top-0 z-20 bg-ink text-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {team.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logo_url} alt="" className={`h-9 w-9 rounded-full object-cover ring-2 ${theme.ring}`} />
            ) : (
              <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${theme.heroFrom} ${theme.heroTo} text-xs font-display`}>
                {team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold">{team.name}</p>
              <p className="text-[11px] text-white/40">{team.coach_name}</p>
            </div>
          </div>
          <form action={coachLogout.bind(null, params.token)}>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut size={14} /> Dekonekte
            </button>
          </form>
        </div>
        <div className={`h-0.5 bg-gradient-to-r ${theme.heroFrom} ${theme.heroTo}`} />
      </header>

      <div className="mx-auto max-w-md px-4 py-5">{children}</div>

      <BottomNav token={params.token} />
    </div>
  );
}
