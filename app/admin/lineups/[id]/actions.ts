"use server";

import { requireAdmin } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function reopenLineup(lineupId: string) {
  await requireAdmin();
  const supabase = supabaseAdmin();
  await supabase
    .from("lineups")
    .update({ locked: false, status: "needs_correction" })
    .eq("id", lineupId);
  revalidatePath(`/admin/lineups/${lineupId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/lineups");
}

export async function lockLineup(lineupId: string) {
  await requireAdmin();
  const supabase = supabaseAdmin();
  await supabase.from("lineups").update({ locked: true }).eq("id", lineupId);
  revalidatePath(`/admin/lineups/${lineupId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/lineups");
}
