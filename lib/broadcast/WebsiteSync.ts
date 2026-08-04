import "server-only";
import type { BroadcastConnectionState } from "./types";

/**
 * WebsiteSync — a provider-based service for pushing live match state
 * somewhere outside GGSP: a public results website, a federation site, a
 * mobile app, a REST/GraphQL API, a WebSocket channel. Deliberately not
 * the same registry as BroadcastEngine's (vision-mixer) systems — a
 * "where do we publish match data" concern is a different axis of
 * extensibility than "which production switcher are we driving."
 *
 * No provider is registered today. There is no public results website,
 * mobile app, or external API in this project to sync to — app/page.tsx is
 * a static marketing page with no live data binding. This file is real,
 * working plumbing with an honest empty registry, not a stand-in for a
 * connection that doesn't exist — the same pattern as lib/vmix/ before
 * VMIX_HOST is ever set.
 */

export interface WebsiteSyncPayload {
  matchId: string;
  homeScore: number;
  awayScore: number;
  liveStatusLabel: string;
  updatedAt: string;
}

export type WebsiteSyncResult = { ok: true; providerId: string } | { ok: false; providerId: string; error: string };

export interface WebsiteSyncStatus {
  providerId: string;
  label: string;
  state: BroadcastConnectionState;
  detail?: string;
  checkedAt: string;
}

export interface WebsiteSyncProvider {
  readonly id: string;
  readonly label: string;
  getStatus(): Promise<WebsiteSyncStatus>;
  push(payload: WebsiteSyncPayload): Promise<WebsiteSyncResult>;
}

/** Add a real provider here (e.g. a REST endpoint, a Supabase Realtime channel, a GraphQL mutation) once one actually exists. */
const REGISTERED_PROVIDERS: WebsiteSyncProvider[] = [];

async function getProvidersStatus(): Promise<WebsiteSyncStatus[]> {
  if (REGISTERED_PROVIDERS.length === 0) {
    return [{ providerId: "none", label: "Website Sync", state: "not_configured", checkedAt: new Date().toISOString() }];
  }
  return Promise.all(REGISTERED_PROVIDERS.map((provider) => provider.getStatus()));
}

async function sync(payload: WebsiteSyncPayload): Promise<WebsiteSyncResult[]> {
  if (REGISTERED_PROVIDERS.length === 0) {
    return [{ ok: false, providerId: "none", error: "No website sync provider is configured." }];
  }
  return Promise.all(REGISTERED_PROVIDERS.map((provider) => provider.push(payload)));
}

export const WebsiteSync = { getProvidersStatus, sync, providers: REGISTERED_PROVIDERS };
