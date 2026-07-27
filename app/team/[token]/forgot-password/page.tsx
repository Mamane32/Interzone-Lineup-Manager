import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requestPasswordReset } from "./actions";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { sent?: string };
}) {
  const supabase = supabaseAdmin();
  const { data: team } = await supabase.from("teams").select("id, name").eq("token", params.token).single();
  if (!team) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <Link
          href={`/team/${params.token}/login`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-white"
        >
          <ArrowLeft size={14} /> Tounen nan koneksyon
        </Link>

        <div className="rounded-2xl border border-ink-line bg-gradient-to-b from-ink-panel to-ink p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          {searchParams.sent ? (
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-white">Verifye imèl ou</p>
              <p className="mt-2 text-sm text-ink-muted">
                Si adrès sa a gen yon kont, nou voye yon lyen pou chanje modpas ou.
              </p>
            </div>
          ) : (
            <form action={requestPasswordReset.bind(null, params.token)} className="flex flex-col gap-4">
              <div>
                <p className="font-display text-lg font-semibold text-white">Modpas bliye</p>
                <p className="mt-1 text-sm text-ink-muted">{team.name}</p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-muted">Imèl</span>
                <span className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink px-3 focus-within:border-amber-signal">
                  <Mail size={16} className="text-ink-muted" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="antrenè@ekip.ht"
                    className="h-12 flex-1 bg-transparent text-white placeholder:text-ink-muted focus:outline-none"
                  />
                </span>
              </label>
              <Button type="submit" size="lg" className="w-full">
                Voye lyen
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
