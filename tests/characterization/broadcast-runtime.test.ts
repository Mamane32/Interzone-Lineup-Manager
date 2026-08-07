import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { resolveOwnerForOperator } from "@/lib/broadcast/runtime/ownership";
import { REGISTERED_PROVIDERS, getProvider } from "@/lib/broadcast/runtime/providers";
import { ENGINE_FIXED_CAPABILITIES } from "@/lib/broadcast/runtime/types";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Phase 2's vertical slice: Select Provider -> Connect -> Report Health ->
 * Expose Capabilities -> Become the active owner for Clock and Graphics.
 * These tests cover the pure decision logic (resolveOwnerForOperator) and
 * the provider registry's shape — not getHealth()/getActiveProvider(),
 * which touch the network/database and are exercised by hand against a
 * real deployment instead, same as the rest of this vMix integration.
 */
describe("Production Runtime — provider registration", () => {
  it("registers exactly ggsp and vmix — obs stays reserved, not a real provider yet", () => {
    expect(REGISTERED_PROVIDERS.map((p) => p.id).sort()).toEqual(["ggsp", "vmix"]);
    expect(getProvider("obs")).toBeUndefined();
  });

  it("ggsp claims the Engine-fixed capabilities plus clock and graphics, and accepts no outbound commands", () => {
    const ggsp = getProvider("ggsp")!;
    expect(ggsp.capabilities.canOwn).toEqual(expect.arrayContaining(["website", "statistics", "clock", "graphics"]));
    expect(ggsp.capabilities.canReceiveCommands).toEqual([]);
  });

  it("vmix only claims clock and graphics — no capability without a real VMixEngine translation behind it", () => {
    const vmix = getProvider("vmix")!;
    expect(vmix.capabilities.canOwn.sort()).toEqual(["clock", "graphics"]);
    expect(vmix.capabilities.canReceiveCommands.sort()).toEqual(["clock", "graphics"]);
    for (const reserved of ["replay", "recording", "streaming", "audio", "camera"] as const) {
      expect(vmix.capabilities.canOwn).not.toContain(reserved);
    }
  });
});

describe("Production Runtime — capability ownership resolution", () => {
  it("website and statistics always resolve to ggsp, regardless of the active operator", () => {
    for (const capability of ENGINE_FIXED_CAPABILITIES) {
      expect(resolveOwnerForOperator("vmix", capability)).toBe("ggsp");
      expect(resolveOwnerForOperator("ggsp", capability)).toBe("ggsp");
    }
  });

  it("vmix becomes the owner of clock and graphics when it's the active operator", () => {
    expect(resolveOwnerForOperator("vmix", "clock")).toBe("vmix");
    expect(resolveOwnerForOperator("vmix", "graphics")).toBe("vmix");
  });

  it("ggsp stays the owner of clock and graphics when it's the active operator", () => {
    expect(resolveOwnerForOperator("ggsp", "clock")).toBe("ggsp");
    expect(resolveOwnerForOperator("ggsp", "graphics")).toBe("ggsp");
  });

  it("falls back to ggsp for a capability the active operator hasn't actually claimed, instead of pretending the assignment is real", () => {
    expect(resolveOwnerForOperator("vmix", "recording")).toBe("ggsp");
    expect(resolveOwnerForOperator("vmix", "replay")).toBe("ggsp");
  });

  it("falls back to ggsp for an unregistered operator id (obs) rather than throwing", () => {
    expect(resolveOwnerForOperator("obs", "clock")).toBe("ggsp");
  });
});

describe("Production Runtime — clock.update has a real VMixEngine translation", () => {
  // VMixEngine.ts imports lib/vmix/client.ts, which wraps getVMixStatus in
  // React's cache() — that throws outside an actual Server Component
  // render, so it can't be imported directly in vitest (the same reason no
  // existing test in this project calls VMixEngine.send()). Inspecting the
  // source is the same technique tests/characterization/architecture-
  // guards.test.ts already uses for this exact directory, and proves the
  // same thing a runtime call would: "clock.update" reaches a real
  // vMix Function, not the untranslated-command (`return null`) branch.
  it("translateToVMix maps clock.update to a real vMix SetText call, not the null/untranslated branch", () => {
    const source = fs.readFileSync(path.join(ROOT, "lib/broadcast/VMixEngine.ts"), "utf8");
    const caseMatch = source.match(/case "clock\.update":\s*\n\s*return ([^\n]+);/);
    expect(caseMatch, '"clock.update" should have its own case in translateToVMix').not.toBeNull();
    expect(caseMatch![1]).toMatch(/function: "SetText"/);
    expect(caseMatch![1]).not.toBe("null");
  });
});
