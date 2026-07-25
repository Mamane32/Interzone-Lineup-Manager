"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * Coaches never authenticate. The unguessable `token` in the URL is looked
 * up server-side against the teams table — that lookup IS the access
 * control for everything in this file.
 */
export async function submitLineup(token: string, formData: FormData): Promise<SubmitResult> {
  const supabase = supabaseAdmin();

  const { data: team } = await supabase.from("teams").select("*").eq("token", token).single();
  if (!team) return { ok: false, error: "Ekip pa jwenn." };

  const matchId = String(formData.get("match_id") ?? "");
  const { data: lineup } = await supabase
    .from("lineups")
    .select("*")
    .eq("match_id", matchId)
    .eq("team_id", team.id)
    .single();
  if (!lineup) return { ok: false, error: "Match pa jwenn." };
  if (lineup.locked) return { ok: false, error: "Lis la deja fèmen." };

  const coach_name = String(formData.get("coach_name") ?? "").trim();
  const coach_phone = String(formData.get("coach_phone") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const captain_id = String(formData.get("captain_id") ?? "") || null;

  const starting_xi = Array.from({ length: 11 }, (_, i) => String(formData.get(`starter_${i}`) ?? "")).filter(Boolean);
  const substitutes = Array.from({ length: 9 }, (_, i) => String(formData.get(`sub_${i}`) ?? "")).filter(Boolean);

  if (!coach_name || !coach_phone) return { ok: false, error: "Tanpri mete non ak telefòn antrenè a." };
  if (starting_xi.length !== 11) return { ok: false, error: "Ou dwe chwazi 11 titilè." };

  const allSelected = [...starting_xi, ...substitutes];
  const uniqueSelected = new Set(allSelected);
  if (uniqueSelected.size !== allSelected.length) {
    return { ok: false, error: "Yon jwè pa ka nan de pozisyon." };
  }
  if (captain_id && !starting_xi.includes(captain_id)) {
    return { ok: false, error: "Kapitèn nan dwe youn nan 11 titilè yo." };
  }

  await supabase.from("teams").update({ coach_name, coach_phone }).eq("id", team.id);

  const { error } = await supabase
    .from("lineups")
    .update({
      starting_xi,
      substitutes,
      captain_id,
      remarks,
      status: "submitted",
      locked: true,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", lineup.id);

  if (error) return { ok: false, error: "Gen yon pwoblèm, eseye ankò." };

  revalidatePath(`/team/${token}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/lineups");
  revalidatePath(`/admin/lineups/${lineup.id}`);

  return { ok: true };
}
