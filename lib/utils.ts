import type { Lineup, Player, Team } from "./types";


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
