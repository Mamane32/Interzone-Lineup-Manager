import "server-only";

/**
 * Classifies whatever `supabase.auth.resetPasswordForEmail` returns so a
 * caller can tell a real send failure (including Supabase's own email
 * rate limit) from success, instead of the previous behavior of ignoring
 * the result entirely and always claiming success. Supabase's JS client
 * surfaces a rate-limited send as an AuthApiError with `status === 429`
 * (sometimes `code === "over_email_send_rate_limit"` too, depending on
 * SDK version) — checking `status` first is the more stable signal.
 */
export function classifyResetError(error: { status?: number; code?: string } | null): "rate_limited" | "failed" | null {
  if (!error) return null;
  if (error.status === 429 || error.code === "over_email_send_rate_limit") return "rate_limited";
  return "failed";
}
