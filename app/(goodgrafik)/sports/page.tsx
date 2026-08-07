import { redirect } from "next/navigation";

/**
 * The Sports world's route exists so the master nav/bottom bar has a
 * stable `/sports` entry alongside its Culture/News/Studio siblings, but
 * Sports itself is not rebuilt here — it redirects straight into the real,
 * existing GGScoreLive public experience (app/scores/page.tsx and
 * everything under it), which keeps working exactly as it did before this
 * master platform existed.
 */
export default function SportsWorldPage() {
  redirect("/scores");
}
