import type { Invitation, InvitationStatus, Lineup, Player, Team } from "./types";


export function playerLabel(p: Pick<Player, "number" | "full_name">): string {
  return `${String(p.number).padStart(2, "0")} - ${p.full_name}`;
}

export function teamLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base.replace(/\/$/, "")}/team/${token}`;
}

export function playersById(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]));
}

/**
 * The invitations table's own `status` column only transitions to
 * 'expired' lazily, at the moment someone actually attempts to accept a
 * lapsed invitation (see `finalizeAcceptedInvitation` in
 * lib/invitations.ts) — nothing proactively sweeps it. Until that happens,
 * a pending invitation whose `expires_at` has passed stays 'pending' in
 * the database. This computes the status a person should actually see
 * right now, without mutating the row — `resendInvitation`
 * (app/admin/invitations/actions.ts) already works on an "expired-looking"
 * pending invitation exactly as it would on any other pending (or a
 * genuinely already-`expired`) one.
 */
export function effectiveInvitationStatus(inv: Pick<Invitation, "status" | "expires_at">): InvitationStatus {
  if (inv.status === "pending" && inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return "expired";
  }
  return inv.status;
}

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------

export function exportSimpleList(lineup: Lineup, players: Player[]): string {
  const byId = playersById(players);
  const lines = lineup.starting_xi
    .map((id) => byId.get(id))
    .filter((p): p is Player => Boolean(p))
    .map((p) => `${String(p.number).padStart(2, "0")} ${p.full_name}`);
  return lines.join("\n");
}

export function exportVMix(
  lineup: Lineup,
  players: Player[],
  team: Team
): string {
  const byId = playersById(players);
  const lines: string[] = [];
  lines.push(`TEAM=${team.name}`);
  lines.push(`COACH=${team.coach_name}`);

  const captain = lineup.captain_id ? byId.get(lineup.captain_id) : undefined;
  lines.push(
    `CAPTAIN=${captain ? `${String(captain.number).padStart(2, "0")} ${captain.full_name}` : ""}`
  );

  lineup.starting_xi.forEach((id, i) => {
    const p = byId.get(id);
    lines.push(
      `PLAYER${String(i + 1).padStart(2, "0")}=${p ? `${String(p.number).padStart(2, "0")} ${p.full_name}` : ""}`
    );
  });

  lineup.substitutes.forEach((id, i) => {
    const p = byId.get(id);
    lines.push(
      `SUB${String(i + 1).padStart(2, "0")}=${p ? `${String(p.number).padStart(2, "0")} ${p.full_name}` : ""}`
    );
  });

  return lines.join("\n");
}

export function exportPlainText(
  lineup: Lineup,
  players: Player[],
  team: Team
): string {
  const byId = playersById(players);
  const lines: string[] = [team.name, ""];

  lines.push("Titulaires");
  lineup.starting_xi.forEach((id) => {
    const p = byId.get(id);
    if (p) lines.push(`${String(p.number).padStart(2, "0")} ${p.full_name}`);
  });

  lines.push("");
  lines.push("Remplaçants");
  lineup.substitutes.forEach((id) => {
    const p = byId.get(id);
    if (p) lines.push(`${String(p.number).padStart(2, "0")} ${p.full_name}`);
  });

  return lines.join("\n");
}

export function formatMatchDate(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}`);
  return d.toLocaleString("fr-HT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
