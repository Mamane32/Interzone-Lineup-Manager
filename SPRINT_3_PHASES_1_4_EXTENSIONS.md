# GGSP — Sprint 3, Phases 1–4: Live Match Experience Extensions

Implements the four "extension" phases from
[SPRINT_3_LIVE_MATCH_EXPERIENCE_REVIEW.md](SPRINT_3_LIVE_MATCH_EXPERIENCE_REVIEW.md),
per the confirmed decisions. No stops between phases — all four were
already fully specified, no open architectural questions.

## Phase 1 — Live Match Center

- **Migration 014** (`014_match_officials.sql`): four nullable columns on
  `matches` (`assistant_referee_1_name`,
  `assistant_referee_2_name`, `fourth_official_name`, `var_official_name`)
  per the confirmed decision — one officiating crew per match, plain
  columns, no separate table. Verified against the live database (all 9
  steps): schema, constraints, a real write+read (including the
  `venue_record` join) with temporary data, then reverted.
- `lib/live-match.ts`'s `getLiveMatch` now joins `venues` via
  `match.venue_id` as `venue_record` — real Foundation data (capacity,
  city, surface, an uploaded photo) the Live Match Center can show,
  reusing Sprint 1/2 data instead of inventing a parallel "stadium info"
  concept.
- `MatchHeaderPanel.tsx` rebuilt: real stadium block (photo, city,
  capacity, falling back to the old free-text `venue`/team-name default
  when no venue record is linked), a Match Officials strip showing only
  whichever roles are actually set, and Weather/Attendance as visually
  polished placeholder chips (Attendance is new to this panel — it
  previously only existed in the Match Report page). The edit form grew a
  venue picker (`<select>` of real venues) alongside the existing venue/
  referee text fields and four new officials fields.
- `MatchScorePanel.tsx`'s hardcoded 54/46 possession bar removed — it
  duplicated `StatisticsPanel.tsx`'s own (also hardcoded) placeholder;
  Phase 5 gives one real number in one place instead of two guesses.

## Phase 2 — Live Timeline

Purely visual — the underlying data and event types were already
correct. `EVENT_META` (`MatchTimelineEvent.tsx`) moved from emoji glyphs
to `lucide-react` icons in colored badges (emerald for goals, amber/red
for cards, blue for substitutions, purple for VAR), reusing the exact
icon choices already established in `QuickControlsBar.tsx` (Pause for
Half Time, Flag for Match End, Hourglass for Additional Time) so the
Timeline and the Control Room read as one product. The Match Report
page's own event list (which imports `EVENT_META`) picked up the same
treatment for free. Period-group headers gained a subtle divider line.

## Phase 3 — Graphics Integration

The real finding here: `lib/broadcast/EventEngine.ts` and `ScoreEngine.ts`
were already wired into `app/live/[matchId]/actions.ts` (their "not
called from any Server Action yet" doc comments were stale) — but three
event types (`var`, `penalty_missed`, `injury`) called
`GraphicsEngine.takeGraphic()` **directly**, bypassing the Production
Queue entirely: no persisted row, invisible to Program/Preview and to
BroadcastPanel's own queue state. That's the exact violation of
"Production Queue as the single dispatch layer for graphics."

Fixed by:
- New `lib/broadcast/ProductionQueueEngine.enqueueAndTakeProductionItem()`
  — the shared "enqueue then take" sequence, so neither call site
  (BroadcastPanel's manual Take, or this phase's automatic trigger)
  re-implements the two-step logic itself.
- New `lib/broadcast/graphics-automation.ts` — a lookup table
  (`MatchEventType -> graphic catalog key`), not a branch embedded in the
  Server Action, so which events trigger which graphic is a one-line
  edit in one place. Wired into `addGoalEvent`/`addMatchEvent` after each
  event's database write succeeds, alongside (not replacing) the
  existing `broadcastGoal`/`broadcastCard`/etc. calls — those keep vMix's
  live data fields in sync; this puts the matching graphic asset on air.
- The three direct `takeGraphic()` bypasses removed; VAR/Penalty/Injury
  now route through the queue like every other event. Two new catalog
  entries (`"VAR Review"`, `"Penalty"`, `"Injury"`) added to
  `BroadcastPanel.tsx`'s existing fixed catalog so these show up as
  manually-clickable entries too, not just automatic ones.
- Stale doc comments in `GraphicsEngine.ts`/`EventEngine.ts`/
  `ScoreEngine.ts` corrected to describe what's actually true now.

**Why not `AUTOMATION_RULES`** (the task was originally framed as "via
AutomationPipeline"): that array's rules produce more `BroadcastCommand`s
dispatched through `BroadcastEngine.dispatch()` straight to vMix —
exactly the mechanism that bypasses the Production Queue. Using it for
graphics would have reintroduced the same bug this phase fixed. The
queue needs a direct function call (`autoTriggerGraphicForEvent`), not a
command-production rule.

## Phase 4 — Broadcast Experience polish

- **Keyboard shortcuts**: every Operator Shortcuts button
  (`QuickControlsBar.tsx`) now has a single-key shortcut (G/Y/R/S/V/P/A
  for events, H/X/K/F for status changes, U for Undo), shown as a small
  badge on the button itself so the shortcut is discoverable, not hidden.
  A `keydown` listener ignores keystrokes while typing in any input/
  textarea/select/contenteditable, while a modifier key is held, or while
  any dialog is open — so it never fights normal typing or a browser
  shortcut.
- **Multi-monitor**: per the confirmed decision, no display detection, no
  experimental APIs — the existing pop-out Program/Preview links
  (Sprint 2 Phase 4) remain the whole story.

## Quality gate

Ran after every phase individually and again at the end of all four:
`npm run typecheck`, `npm run lint`, `npm run test` (129 tests, 13
files), `npm run build` — all clean throughout. Migration 014 went
through the full 9-step verification against the live database.
