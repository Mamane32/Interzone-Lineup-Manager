"use server";

import { redirect } from "next/navigation";
import { getSessionUser, getActiveAssignments } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Validates the chosen assignment on the server before redirecting —
 * never trusts a path submitted by the client. The form only ever submits
 * an assignmentId; this looks up that assignment fresh, confirms it
 * belongs to the current session's user and is still active, and only
 * then resolves where it leads.
 */
export async function selectWorkspace(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const assignments = await getActiveAssignments(user.id);
  const chosen = assignments.find((a) => a.id === assignmentId);
  if (!chosen) redirect("/select-workspace?error=invalid");

  if (chosen.role_key === "coach" && chosen.team_id) {
    const admin = supabaseAdmin();
    const { data: team } = await admin.from("teams").select("token").eq("id", chosen.team_id).single();
    if (!team) redirect("/select-workspace?error=invalid");
    redirect(`/team/${team.token}/dashboard`);
  }

  const STATIC_DESTINATION: Record<string, string> = {
    super_admin: "/admin/dashboard",
    admin: "/admin/dashboard",
    broadcast_operator: "/live",
    competition_manager: "/competition",
    referee: "/referee",
    media: "/media",
    viewer: "/viewer",
  };

  const path = STATIC_DESTINATION[chosen.role_key];
  if (!path) redirect("/select-workspace?error=invalid");
  redirect(path);
}
