# GGSP — Sprint 2, Phase 4: Match Operations & Broadcast Experience

Implements the product decisions confirmed on top of
[SPRINT_2_PHASE_4_BROADCAST_REVIEW.md](SPRINT_2_PHASE_4_BROADCAST_REVIEW.md)
— the four numbered decisions plus the Branding/Navigation/Operator
Shortcuts/Philosophy items. Decisions 1 and 4, and the Branding/
Navigation/Operator Shortcuts items, were extensions of existing
architecture and are implemented here (Tasks 54–59). Decisions 2
(persisted Graphics Queue) and 3 (scalable Preview/Program) are new
subsystems and, per the standing instruction to wait for an architecture
proposal before implementing one, are **not** implemented in this phase —
each gets its own proposal (Tasks 61–62) before any code is written.

## 1. Additional Time bug fix + full shortcut coverage (Task 54)

`QuickControlsBar.tsx`'s "Additional Time" button dispatched
`type: "var"` — a copy-paste duplicate of the VAR button, not a distinct
event. Migration 011 adds a real `additional_time` value to the
`match_event_type` enum; the button now dispatches that. `EVENT_META`
(`MatchTimelineEvent.tsx`) and `LABEL` (`HighlightsIndex.tsx`) — the two
other places a `MatchEventType` must be rendered — gained the matching
entry, caught by `tsc` refusing to compile an incomplete `Record`.

Extra Time and Penalty Shootout, previously reachable only from Status
Controls' full dropdown, are now direct Quick Bar buttons (`confirm:
true`, matching Full Time's existing "changes state for everyone"
safeguard).

## 2. Real branding (Task 55)

`organizations.logo_url` / `competitions.logo_url` have existed since
migration 006 but were never read: `withCompetition()` in `lib/branding.ts`
carried a comment claiming "competitions has no logo column" and only
ever set `competitionName`. Rewritten to read both logos and the
organization's name/logo from the already-joined `competition.organization`
relation; `getLiveMatch`'s select string extended to actually fetch that
join. `BrandBar.tsx` rewritten to render League → Competition as a real
two-tier hierarchy (org logo + competition logo, org name as a small
eyebrow above the competition name) instead of a single flat name/logo
pair, with the existing Production Partner / "Powered by GoodGrafik" line
unchanged beneath it.

## 3. Smart minute-entry presets (Task 56)

New shared `components/live/MinutePicker.tsx`: "Current Minute" (default,
computed by the new `deriveCurrentMinuteValue()` in `lib/match-clock.ts`
from `live_status` + the latest timeline event, the same derivation
`deriveMatchClock` already used for the display clock), relative `+1 +2
+3 +5` (via new `addMinutes()`, which adds to the stoppage-time component
once a minute is already in "45+2" notation rather than bumping the base),
fixed presets `45' 90' 90+1 90+2 90+3 105' 120'`, and `Custom` as the
explicit last resort. Replaces the free-text minute `<input>` inside
`GoalDialog` and `EventDialog` — the two dialogs a Goal or event action
actually opens. (`MatchTimelineEvent.tsx`'s own inline Edit dialog keeps
free text deliberately — it's a low-frequency correction path, not the
primary logging workflow this decision targets.) `status`/`events` now
flow down through `EventControls`, `QuickControlsBar`, and `ScoreControl`
so every call site can derive its own current minute.

## 4. Persistent Broadcast navigation (Task 57)

`BroadcastHeader.tsx` reuses the existing `BrandMark` crest (already used
on the login page, not a new mark) as a permanent "GG" shortcut back to
`/live`. The previously separate, differently-styled Formation link,
Readiness chip, and Report link are unified into one active-state-aware
nav cluster (`usePathname()`-driven), plus a new "Control Room" entry —
so every module under `/live/[matchId]/**` is one click from every other,
instead of relying on browser back navigation.

## 5. Formation Broadcast View — both teams, one pitch (Task 58)

New `components/formation/BothTeamsPitchView.tsx`, in the shared
role-neutral rendering directory (not `components/live/`) since it must
be reusable by the Graphics Engine, Live Center, Match Reports, and future
PNG/social exports per the decision. Built entirely on the existing shared
layer — `PitchMarkings` (one background, not two) and `PlayerToken`
(reused as-is, `dragging={false}` and no-op handlers, since it already
renders the captain "C" and goalkeeper "GK" badges natively) — so
captain/goalkeeper indicators required zero new rendering logic.

The only new logic is the coordinate transform that compresses each
team's own full-pitch 0–100 y-scale into half of one shared pitch:
home → `100 - y/2` (bottom half, attacking up to midfield), away → `y/2`
(top half, attacking down to midfield); x passes through unchanged. Wired
into `TacticalFormationBoard.tsx` as a new "Broadcast View" tab, reading
both teams' *saved* formations (via `buildInitialPositions`, independent
of whichever side is currently being edited) rather than the single
side's live drag state — a broadcast graphic shouldn't air an in-progress
edit for the team that isn't the active tab. Gated on both teams having a
full 11-player XI resolved.

## 6. Operator Shortcuts redesign (Task 59)

Two changes, both direct applications of the stated philosophy ("if a
workflow can be completed in one click instead of three, choose the
one-click workflow"):

- **VAR and Additional Time now fire on click**, with no dialog at all,
  when a current minute can be derived — previously they opened the same
  `EventDialog` as Yellow Card/Substitution even though neither needs a
  team or player, so the dialog existed solely to make the operator click
  a second "Add to Timeline" confirm. They fall back to the dialog only
  when no current minute exists yet (pre-match/half-time/full-time/
  penalties), since a minute must then be chosen manually.
- **Visual redesign**: emoji glyphs replaced with `lucide-react` icons
  (matching the icon system used everywhere else in the product), events
  grouped under labeled "Match Events" / "Match Status" clusters instead
  of one undifferentiated row, yellow/red cards rendered as actual
  colored squares rather than emoji.

Goal, the cards, Substitution, and Penalty still open a dialog — they
need a specific player, which is real data to capture, not friction to
remove — but the minute inside already defaults to the current minute
(Task 56), so the remaining flow is "pick player, confirm," not "type a
minute too."

## 7. Quality gate

- `lib/match-clock.ts`'s new `deriveCurrentMinuteValue()` and
  `addMinutes()` gained unit test coverage in
  `tests/characterization/match-clock.test.ts` (10 new cases: the four
  null-minute statuses, kickoff, each half's zero-event fallback, latest-
  event selection independent of array order, stoppage-time preservation,
  and both `addMinutes` branches).
- `npm run typecheck`, `npm run lint`, `npm run test` (127 tests, 13
  files), and `npm run build` all pass clean.

## Deferred to their own architecture-proposal cycles

- **Decision 2 — persisted Graphics Queue** (Task 61): must survive
  refresh/reconnect/operator handoff; not started.
- **Decision 3 — scalable Preview/Program** (Task 62): cross-window
  messaging architecture for single/dual/external-display and future
  production rooms; not started.

Neither has any code written yet, per the standing instruction to wait
for the proposal before implementing a major new subsystem.
