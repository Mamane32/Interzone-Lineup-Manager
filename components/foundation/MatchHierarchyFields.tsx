"use client";

import { useMemo, useState } from "react";
import Select from "@/components/ui/Select";
import type { Competition, CompetitionGroup, Division, Season, Stage, Venue } from "@/lib/types";

/**
 * Cascading competition-structure picker for match scheduling. An admin
 * only ever needs to choose the MOST SPECIFIC level they know — picking a
 * Group is enough, the database trigger (migration 008) backfills Stage,
 * Division, Season, and Competition automatically. Every level is
 * optional; a match can still be scheduled with none of these set, exactly
 * as before this feature existed.
 */
export default function MatchHierarchyFields({
  competitions,
  seasons,
  divisions,
  stages,
  groups,
  venues,
}: {
  competitions: Competition[];
  seasons: Season[];
  divisions: Division[];
  stages: Stage[];
  groups: CompetitionGroup[];
  venues: Venue[];
}) {
  const [competitionId, setCompetitionId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [stageId, setStageId] = useState("");

  const seasonOptions = useMemo(
    () => seasons.filter((s) => s.competition_id === competitionId),
    [seasons, competitionId]
  );
  const divisionOptions = useMemo(
    () => divisions.filter((d) => d.season_id === seasonId),
    [divisions, seasonId]
  );
  const stageOptions = useMemo(
    () => stages.filter((s) => s.division_id === divisionId),
    [stages, divisionId]
  );
  const groupOptions = useMemo(
    () => groups.filter((g) => g.stage_id === stageId),
    [groups, stageId]
  );

  return (
    <fieldset className="rounded-xl border border-white/[0.08] p-3 sm:col-span-2">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-white/35">Competition structure (optional)</legend>
      <p className="mb-3 text-xs text-white/30">
        Pick as specific a level as you know — choosing a Group automatically scopes the Season, Division, and Stage too.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          id="competition_id"
          name="competition_id"
          label="Competition"
          tone="dark"
          value={competitionId}
          onChange={(e) => {
            setCompetitionId(e.target.value);
            setSeasonId("");
            setDivisionId("");
            setStageId("");
          }}
        >
          <option value="">None</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          id="season_id"
          name="season_id"
          label="Season"
          tone="dark"
          value={seasonId}
          disabled={!competitionId}
          onChange={(e) => {
            setSeasonId(e.target.value);
            setDivisionId("");
            setStageId("");
          }}
        >
          <option value="">{competitionId ? "None" : "Select a competition first"}</option>
          {seasonOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          id="division_id"
          name="division_id"
          label="Division"
          tone="dark"
          value={divisionId}
          disabled={!seasonId}
          onChange={(e) => {
            setDivisionId(e.target.value);
            setStageId("");
          }}
        >
          <option value="">{seasonId ? "None" : "Select a season first"}</option>
          {divisionOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select id="stage_id" name="stage_id" label="Stage" tone="dark" value={stageId} disabled={!divisionId} onChange={(e) => setStageId(e.target.value)}>
          <option value="">{divisionId ? "None" : "Select a division first"}</option>
          {stageOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select id="group_id" name="group_id" label="Group" tone="dark" disabled={!stageId} defaultValue="">
          <option value="">{stageId ? "None" : "Select a stage first"}</option>
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select id="venue_id" name="venue_id" label="Venue" tone="dark" defaultValue="">
          <option value="">None</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.city ? ` — ${v.city}` : ""}
            </option>
          ))}
        </Select>
      </div>
    </fieldset>
  );
}
