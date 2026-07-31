import "server-only";
import { BroadcastEngine } from "./BroadcastEngine";
import type { BroadcastCommand, BroadcastCommandResult } from "./types";

export type AutomationRule = {
  id: string;
  description: string;
  /** Whether this rule should react to the given trigger command. */
  matches: (command: BroadcastCommand) => boolean;
  /** The additional command(s) this rule causes. */
  produce: (command: BroadcastCommand) => BroadcastCommand[];
};

/**
 * Declarative "when X happens, also do Y" rules — e.g. a future rule could
 * read "on event.goal, also produce a graphic.take for the Goal lower
 * third." Empty today: ScoreEngine/EventEngine/GraphicsEngine work
 * correctly with zero rules configured (every command still reaches
 * BroadcastEngine), so adding the first real rule is additive, not a
 * prerequisite for anything else in this directory.
 */
export const AUTOMATION_RULES: AutomationRule[] = [];

/**
 * Runs one command through BroadcastEngine, then evaluates every
 * automation rule against it and dispatches whatever each matching rule
 * produces. This is the only path ScoreEngine, EventEngine, and
 * GraphicsEngine use to reach BroadcastEngine — keeping automation rules
 * in one place instead of scattered across the three domain engines.
 *
 * Rules do not chain: a command a rule produces is dispatched but not
 * re-evaluated against AUTOMATION_RULES. Deliberate — prevents a
 * misconfigured rule from silently looping.
 */
async function run(command: BroadcastCommand): Promise<BroadcastCommandResult[]> {
  const results = await BroadcastEngine.dispatch(command);

  const matchingRules = AUTOMATION_RULES.filter((rule) => rule.matches(command));
  const producedResults = await Promise.all(
    matchingRules.flatMap((rule) => rule.produce(command).map((produced) => BroadcastEngine.dispatch(produced)))
  );

  return [...results, ...producedResults.flat()];
}

export const AutomationPipeline = { run, rules: AUTOMATION_RULES };
