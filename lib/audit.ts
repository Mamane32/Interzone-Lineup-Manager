import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Records one append-only audit event. Never throws — a failed audit write
 * should not block the underlying admin action from completing (e.g. don't
 * fail a legitimate account suspension because the audit insert had a
 * transient error); it's logged to the server console instead.
 *
 * metadata must never contain passwords, tokens, or other secrets — see
 * the callers in app/admin/{users,invitations,access,roles}/actions.ts,
 * each of which only passes small, specific, non-sensitive fields.
 */
export async function recordAuditEvent(params: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = supabaseAdmin();
    await admin.from("audit_logs").insert({
      actor_user_id: params.actorUserId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("audit log write failed", params.action, err);
  }
}
