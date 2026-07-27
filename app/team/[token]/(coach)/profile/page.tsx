import { Mail, Phone, Trophy, ShieldQuestion, KeyRound } from "lucide-react";
import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { changePassword } from "./actions";
import { coachLogout } from "../../login/actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  short: "Modpas la dwe gen omwen 8 karaktè.",
  mismatch: "Modpas yo pa menm.",
  "1": "Nou pa t kapab chanje modpas la.",
};

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string; saved?: string };
}) {
  const { team, email } = await requireCoach(params.token);

  const supabase = supabaseAdmin();
  const { data: competition } = team.competition_id
    ? await supabase.from("competitions").select("name").eq("id", team.competition_id).single()
    : { data: null };

  const errorMessage = searchParams.error ? ERRORS[searchParams.error] ?? "Gen yon erè." : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-ink to-ink-panel p-6 text-center text-white shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 font-display text-xl">
          {team.coach_name.slice(0, 2).toUpperCase()}
        </div>
        <p className="font-display text-lg font-semibold">{team.coach_name}</p>
        <p className="text-xs text-white/50">Antrenè · {team.name}</p>
      </div>

      <Card className="!bg-coach-card !border-coach-line text-ink">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Enfòmasyon
        </h2>
        <div className="flex flex-col gap-3 text-sm">
          <Row icon={<Trophy size={16} />} label="Ekip" value={team.name} />
          {competition?.name && <Row icon={<ShieldQuestion size={16} />} label="Konpetisyon" value={competition.name} />}
          <Row icon={<Mail size={16} />} label="Imèl" value={email} />
          <Row icon={<Phone size={16} />} label="Telefòn" value={team.coach_phone} />
        </div>
      </Card>

      <Card className="!bg-coach-card !border-coach-line text-ink">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          <KeyRound size={14} /> Chanje modpas
        </h2>
        <form action={changePassword.bind(null, params.token)} className="flex flex-col gap-3">
          <input
            name="password"
            type="password"
            placeholder="Nouvo modpas"
            required
            minLength={8}
            className="h-12 rounded-xl border border-coach-line bg-white px-3 text-ink focus:border-status-submitted focus:outline-none"
          />
          <input
            name="confirm"
            type="password"
            placeholder="Konfime modpas"
            required
            minLength={8}
            className="h-12 rounded-xl border border-coach-line bg-white px-3 text-ink focus:border-status-submitted focus:outline-none"
          />
          {errorMessage && <p className="text-sm font-medium text-status-correction">{errorMessage}</p>}
          {searchParams.saved && <p className="text-sm font-medium text-status-submitted">Modpas chanje ✓</p>}
          <Button type="submit" variant="coach">
            Sove nouvo modpas
          </Button>
        </form>
      </Card>

      <form action={coachLogout.bind(null, params.token)}>
        <Button type="submit" variant="danger" className="w-full">
          Dekonekte
        </Button>
      </form>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink/5 text-ink/50">
        {icon}
      </span>
      <div>
        <p className="text-xs text-ink/40">{label}</p>
        <p className="font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
