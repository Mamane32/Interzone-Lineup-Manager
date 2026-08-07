import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPublicGroups } from "@/lib/public-groups";
import { resolveQuarterfinals, type ResolvedSlot } from "@/lib/bracket";
import type { MatchLiveStatus } from "@/lib/types";

/**
 * The full knockout bracket — Quarterfinals (already resolvable from
 * group standings alone, via resolveQuarterfinals) plus Semifinals and
 * the Final, which lib/bracket.ts's own template stopped at: those two
 * rounds can only resolve once the *real* QF/SF matches (created by an
 * admin once resolveQuarterfinals shows a real matchup, same workflow
 * bracket.ts's own doc comment describes) have been played. This module
 * is the seam that closes that gap — same public-DTO discipline as
 * every other lib/public-*.ts module.
 *
 * Real knockout fixtures are identified by their `round` column
 * ("QF1".."QF4", "SF1"/"SF2", "Final") — the same free-text field every
 * match already has, not a new schema concept.
 */

export type BracketMatch = {
  id: string;
  label: string;
  home: ResolvedSlot;
  away: ResolvedSlot;
  matchId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  liveStatus: MatchLiveStatus | null;
  isLive: boolean;
  matchDate: string | null;
  matchTime: string | null;
};

export type PublicBracket = {
  quarterfinals: BracketMatch[];
  semifinals: BracketMatch[];
  final: BracketMatch;
};

const KNOCKOUT_ROUNDS = ["QF1", "QF2", "QF3", "QF4", "SF1", "SF2", "Final"] as const;

type RealMatchRow = {
  id: string;
  round: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  live_status: MatchLiveStatus | null;
  match_date: string;
  match_time: string;
};

/** The real match's score/status layered onto a template-resolved slot pair — the slot identities (who's playing) come from the template/previous round's winners; the score/live status comes from the real row, once one exists. */
function withRealMatch(id: string, label: string, home: ResolvedSlot, away: ResolvedSlot, real: RealMatchRow | undefined): BracketMatch {
  return {
    id,
    label,
    home,
    away,
    matchId: real?.id ?? null,
    homeScore: real?.home_score ?? null,
    awayScore: real?.away_score ?? null,
    liveStatus: real?.live_status ?? null,
    isLive: real ? real.live_status !== "pre_match" && real.live_status !== "full_time" : false,
    matchDate: real?.match_date ?? null,
    matchTime: real?.match_time ?? null,
  };
}

/** The winning team of a finished real knockout match, as a resolved slot — null if the match doesn't exist yet, isn't finished, or (rare, single-leg knockout with no recorded penalty shootout) ended level, since there's nothing safe to guess from an equal score alone. */
function winnerSlot(real: RealMatchRow | undefined, home: ResolvedSlot, away: ResolvedSlot): ResolvedSlot | null {
  if (!real || real.live_status !== "full_time" || real.home_score === null || real.away_score === null) return null;
  if (real.home_score > real.away_score) return home.resolved ? home : null;
  if (real.away_score > real.home_score) return away.resolved ? away : null;
  return null;
}

export async function getPublicBracket(): Promise<PublicBracket> {
  const groups = await getPublicGroups();
  const qfTemplate = resolveQuarterfinals(groups);

  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("matches")
    .select("id, round, home_team_id, away_team_id, home_score, away_score, live_status, match_date, match_time")
    .in("round", KNOCKOUT_ROUNDS);
  const byRound = new Map(((data ?? []) as RealMatchRow[]).map((r) => [r.round, r]));

  const quarterfinals = qfTemplate.map((qf) => withRealMatch(qf.id, qf.label, qf.home, qf.away, byRound.get(qf.id)));

  const qf1Winner = winnerSlot(byRound.get("QF1"), quarterfinals[0].home, quarterfinals[0].away);
  const qf2Winner = winnerSlot(byRound.get("QF2"), quarterfinals[1].home, quarterfinals[1].away);
  const qf3Winner = winnerSlot(byRound.get("QF3"), quarterfinals[2].home, quarterfinals[2].away);
  const qf4Winner = winnerSlot(byRound.get("QF4"), quarterfinals[3].home, quarterfinals[3].away);

  const sf1Home = qf1Winner ?? { resolved: false, label: "Vènkè QF1" };
  const sf1Away = qf2Winner ?? { resolved: false, label: "Vènkè QF2" };
  const sf2Home = qf3Winner ?? { resolved: false, label: "Vènkè QF3" };
  const sf2Away = qf4Winner ?? { resolved: false, label: "Vènkè QF4" };

  const semifinals = [
    withRealMatch("SF1", "1e Demi Final", sf1Home, sf1Away, byRound.get("SF1")),
    withRealMatch("SF2", "2yèm Demi Final", sf2Home, sf2Away, byRound.get("SF2")),
  ];

  const sf1Winner = winnerSlot(byRound.get("SF1"), semifinals[0].home, semifinals[0].away);
  const sf2Winner = winnerSlot(byRound.get("SF2"), semifinals[1].home, semifinals[1].away);

  const final = withRealMatch(
    "Final",
    "Grande Finale",
    sf1Winner ?? { resolved: false, label: "Vènkè 1e Demi Final" },
    sf2Winner ?? { resolved: false, label: "Vènkè 2yèm Demi Final" },
    byRound.get("Final")
  );

  return { quarterfinals, semifinals, final };
}
