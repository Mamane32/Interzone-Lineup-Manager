import { KeyRound } from "lucide-react";
import Link from "next/link";
import { setNewPassword } from "./actions";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  short: "Modpas la dwe gen omwen 8 karaktè.",
  mismatch: "Modpas yo pa menm.",
  "1": "Nou pa t kapab chanje modpas la. Mande yon nouvo lyen.",
  expired: "Lyen sa a pa valab ankò oswa li ekspire. Mande yon nouvo lyen.",
  callback: "Nou pa t kapab verifye lyen an. Mande yon nouvo lyen epi eseye ankò.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const errorMessage = searchParams.error ? ERRORS[searchParams.error] ?? "Gen yon erè." : null;
  const recoveryHref = searchParams.token
    ? `/team/${encodeURIComponent(searchParams.token)}/forgot-password`
    : "/login/forgot-password";

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-line bg-gradient-to-b from-ink-panel to-ink p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
        <div className="mb-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-signal/10 text-amber-signal">
            <KeyRound size={22} />
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold text-white">Nouvo modpas</h1>
        </div>

        {!user ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
              {errorMessage ?? ERRORS.expired}
            </p>
            <Link
              href={recoveryHref}
              className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-amber-signal px-6 text-base font-semibold text-ink transition-all hover:brightness-95 active:scale-[0.97]"
            >
              Mande yon nouvo lyen
            </Link>
          </div>
        ) : (
          <form action={setNewPassword.bind(null, searchParams.token)} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-muted">Nouvo modpas</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12 rounded-xl border border-ink-line bg-ink px-3 text-white focus:border-amber-signal focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-muted">Konfime modpas</span>
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12 rounded-xl border border-ink-line bg-ink px-3 text-white focus:border-amber-signal focus:outline-none"
              />
            </label>

            {errorMessage && (
              <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
                {errorMessage}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full">
              Konfime nouvo modpas
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
