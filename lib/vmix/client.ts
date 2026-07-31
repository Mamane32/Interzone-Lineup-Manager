import "server-only";
import { cache } from "react";
import type { VMixCommand, VMixCommandResult, VMixConfig, VMixStatusResult } from "./types";

const REQUEST_TIMEOUT_MS = 2500;

/**
 * Reads connection config from environment — VMIX_HOST / VMIX_PORT. Returns
 * null when unconfigured, which every caller in this file treats as the
 * default, honest state ("not_configured"), never as an error to paper
 * over. No production environment has these set yet; there is no vMix
 * instance in this project's development environment to test against
 * either — see VMIX_INTEGRATION.md.
 */
function getConfig(): VMixConfig | null {
  const host = process.env.VMIX_HOST;
  if (!host) return null;
  return { host, port: Number(process.env.VMIX_PORT ?? 8088) };
}

function buildUrl(config: VMixConfig, params: Record<string, string | number | undefined>): string {
  const url = new URL(`http://${config.host}:${config.port}/api/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Checks whether a configured vMix instance is actually reachable, by
 * calling vMix's real status endpoint (GET /api/ with no Function param
 * returns an XML document including <version>). Memoized per request.
 *
 * This never returns "connected" without a real, successful HTTP response
 * — there is no code path here that fakes reachability.
 */
export const getVMixStatus = cache(async (): Promise<VMixStatusResult> => {
  const checkedAt = new Date().toISOString();
  const config = getConfig();
  if (!config) return { state: "not_configured", checkedAt };

  try {
    const res = await fetch(buildUrl(config, {}), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return { state: "error", error: `vMix responded with HTTP ${res.status}`, checkedAt };

    const xml = await res.text();
    const version = xml.match(/<version>(.*?)<\/version>/)?.[1];
    const edition = xml.match(/<edition>(.*?)<\/edition>/)?.[1];
    return { state: "connected", version, edition, checkedAt };
  } catch (err) {
    return { state: "error", error: err instanceof Error ? err.message : "vMix instance unreachable.", checkedAt };
  }
});

/**
 * Sends one vMix Function call. Every caller must treat the result as
 * fallible — there is no retry, no queueing, and no assumption that a
 * previous getVMixStatus() call is still valid by the time this runs.
 * Not currently called from any Broadcast Center UI action — see
 * command-map.ts for what each future call site will send.
 */
export async function sendVMixCommand(command: VMixCommand): Promise<VMixCommandResult> {
  const config = getConfig();
  if (!config) return { ok: false, error: "vMix is not configured (VMIX_HOST is not set)." };

  try {
    const url = buildUrl(config, {
      Function: command.function,
      Input: command.input,
      Value: command.value,
      SelectedName: command.selectedName,
    });
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return { ok: false, error: `vMix responded with HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "vMix instance unreachable." };
  }
}
