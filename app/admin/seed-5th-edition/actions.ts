"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { seedFifthEdition } from "@/lib/seed-5th-edition";

export async function runSeed() {
  await requireRole(["super_admin"]);

  let result;
  try {
    result = await seedFifthEdition();
  } catch (err) {
    console.error("seedFifthEdition failed", err);
    redirect("/admin/seed-5th-edition?error=1");
  }

  revalidatePath("/scores");
  revalidatePath("/scores/competition");
  redirect(`/admin/seed-5th-edition?done=1&teams=${result.teams}&created=${result.matchesCreated}&updated=${result.matchesUpdated}`);
}
