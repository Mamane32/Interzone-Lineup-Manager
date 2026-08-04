import Image from "next/image";
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
    <div className="relative min-h-screen overflow-hidden bg-coach-bg pb-24">
      {/* Lightweight ambient background — two soft, team-themed blurred
          washes, not a moving/parallax effect. Reuses the existing
          animate-soft-pulse (already respects prefers-reduced-motion
          globally) instead of introducing a second animation primitive. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 overflow-hidden" aria-hidden="true">
        <div className={`animate-soft-pulse absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br ${theme.heroFrom} ${theme.heroTo} opacity-[0.12] blur-3xl`} />
      </div>

      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-ink/85 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {team.logo_url ? (
              <Image src={team.logo_url} alt="" width={36} height={36} className={`h-9 w-9 rounded-full object-cover ring-2 ${theme.ring}`} />
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

      <BottomNav token={params.token} theme={theme} />
    </div>
  );
}
