import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { listProductionQueue } from "@/lib/broadcast/ProductionQueueEngine";

/**
 * What Program/Preview poll to stay current — same auth pattern as
 * app/api/live/[matchId]/route.ts (cookie session -> role check via
 * user_access_assignments -> service-role read). The browser never talks
 * to Supabase directly and never holds a service-role credential; this
 * route is the only thing that does, matching every other data access
 * path in this project. Polling here, rather than a client-side Realtime
 * subscription, is a deliberate choice: this project has zero RLS
 * policies today (every table is service-role-only), and adding the
 * first one just to let the browser subscribe directly would be a bigger,
 * separate decision than this feature needs — see
 * SPRINT_2_PHASE_4_PREVIEW_PROGRAM_PROPOSAL.md.
 */
export async function GET(_request: Request, { params }: { params: { matchId: string } }) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const [{ data: profile }, { data: assignment }] = await Promise.all([
    supabase.from("profiles").select("status").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_access_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role_key", ["broadcast_operator", "admin", "super_admin"])
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile || profile.status !== "active" || !assignment) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const items = await listProductionQueue(params.matchId);
  return NextResponse.json({ items });
}
