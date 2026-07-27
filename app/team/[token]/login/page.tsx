import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { coachLogin } from "./actions";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "1": "Imèl oswa modpas la pa kòrèk.",
  forbidden: "Kont sa a pa gen aksè a ekip sa a.",
};

export default async function CoachLoginPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  const supabase = supabaseAdmin();
  const { data: team } = await supabase.from("teams").select("*").eq("token", params.token).single();
  if (!team) notFound();

  const errorMessage = searchParams.error ? ERRORS[searchParams.error] ?? "Gen yon erè." : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,176,32,0.12),transparent_60%)]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.logo_url}
              alt=""
              className="mx-auto h-16 w-16 rounded-full object-cover ring-4 ring-amber-signal/20"
            />
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ink-panel to-ink text-lg font-display text-amber-signal ring-4 ring-amber-signal/20">
              {team.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-amber-signal">
            <ShieldCheck size={14} /> Koneksyon Antrenè
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white">{team.name}</h1>
        </div>

        <form
          action={coachLogin.bind(null, params.token)}
          className="flex flex-col gap-4 rounded-2xl border border-ink-line bg-gradient-to-b from-ink-panel to-ink p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
        >
          <Field icon={<Mail size={16} />} label="Imèl" name="email" type="email" placeholder="antrenè@ekip.ht" />
          <Field icon={<Lock size={16} />} label="Modpas" name="password" type="password" placeholder="••••••••" />

          {errorMessage && (
            <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
              {errorMessage}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-1 w-full">
            Konekte
          </Button>

          <Link
            href={`/team/${params.token}/forgot-password`}
            className="text-center text-sm text-ink-muted hover:text-white"
          >
            Ou bliye modpas ou?
          </Link>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Pwoblèm pou konekte? Kontakte òganizasyon konpetisyon an.
        </p>
      </div>
    </main>
  );
}

function Field({
  icon,
  label,
  name,
  type,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  type: string;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-muted">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink px-3 focus-within:border-amber-signal">
        <span className="text-ink-muted">{icon}</span>
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required
          className="h-12 flex-1 bg-transparent text-white placeholder:text-ink-muted focus:outline-none"
        />
      </span>
    </label>
  );
}
