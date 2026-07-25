import "server-only";
import { randomBytes } from "node:crypto";

/** Short, URL-safe, unguessable token for a team's private link. */
export function generateTeamToken(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const bytes = randomBytes(8);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
