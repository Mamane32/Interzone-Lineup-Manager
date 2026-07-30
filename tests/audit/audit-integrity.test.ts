import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const insert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "audit_logs") throw new Error(`Unexpected table: ${table}`);
      return { insert };
    },
  }),
}));

import { recordAuditEvent } from "@/lib/audit";

describe("audit integrity characterization", () => {
  it("persists the attributable audit payload without adding unspecified metadata", async () => {
    insert.mockResolvedValueOnce({ error: null });

    await recordAuditEvent({
      actorUserId: "actor-1",
      action: "competition.updated",
      targetType: "competition",
      targetId: "competition-1",
      metadata: { name: "Interzone" },
    });

    expect(insert).toHaveBeenCalledWith({
      actor_user_id: "actor-1",
      action: "competition.updated",
      target_type: "competition",
      target_id: "competition-1",
      metadata: { name: "Interzone" },
    });
  });

  it("preserves the current non-blocking behavior when the audit client throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    insert.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      recordAuditEvent({
        actorUserId: "actor-1",
        action: "user.updated",
        targetType: "user",
      })
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "audit log write failed",
      "user.updated",
      expect.any(Error)
    );
  });

  it("keeps database-level update and delete rejection triggers", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "supabase", "migrations", "005_iam_hardening.sql"),
      "utf8"
    );

    expect(migration).toMatch(/create\s+or\s+replace\s+function\s+reject_audit_log_mutation\(\)/i);
    expect(migration).toMatch(/raise\s+exception\s+'audit_logs is append-only/i);
    expect(migration).toMatch(
      /create\s+trigger\s+audit_logs_no_update\s+before\s+update\s+on\s+audit_logs/i
    );
    expect(migration).toMatch(
      /create\s+trigger\s+audit_logs_no_delete\s+before\s+delete\s+on\s+audit_logs/i
    );
  });
});
