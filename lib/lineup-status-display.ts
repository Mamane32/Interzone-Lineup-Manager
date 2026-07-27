import type { LineupStatus } from "@/lib/types";

/**
 * The brief suggests a richer lineup-status vocabulary (Not Submitted /
 * Draft / Submitted / Approved / Locked) than the Coach Portal's actual
 * enum (waiting / submitted / needs_correction — see supabase/schema.sql).
 * Adding new statuses would be a schema change this sprint avoids, so this
 * maps the real statuses onto brief-friendly labels for display only; the
 * underlying data and Coach Portal behavior are unchanged.
 */
export const LINEUP_STATUS_DISPLAY: Record<LineupStatus, { label: string; tone: "positive" | "warning" | "neutral" }> = {
  waiting: { label: "Not Submitted", tone: "neutral" },
  submitted: { label: "Submitted", tone: "positive" },
  needs_correction: { label: "Draft — Needs Correction", tone: "warning" },
};
