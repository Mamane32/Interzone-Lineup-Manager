# Sprint 2.1 — Broadcast Control Center: Premium UI Upgrade

This sprint covers two successive briefs received in the same conversation:
first a layout/structure redesign (main grid, Quick Action Bar, Live Video
placeholder, Advertising placeholders), then a more detailed premium-UI
brief (dynamic branding hierarchy, renamed to "Broadcast Control Center",
categorized graphics panel, dual video monitors, production status). Both
are reflected in the final state described below — the second brief's
component/architecture guidance took precedence wherever the two
overlapped.

## 1. Summary of changes

The existing Sprint 2 Live Center was **upgraded in place, not rebuilt**.
Every route, the auth model, the data-fetching pattern (`lib/live-match.ts`,
`getLiveMatch`, memoized with React `cache()`), and the core server actions
from Sprint 2 are unchanged. What changed:

- Visible product name is now **"Broadcast Control Center"** everywhere a
  user sees it. Routes (`/live/...`) were intentionally left unchanged, per
  the brief's explicit allowance ("internal filenames or routes may remain
  temporarily unchanged").
- **Dynamic branding**: a new `BrandingConfiguration` type and
  `lib/branding.ts` implement the three-tier hierarchy (organization/
  competition → production partner → permanent "Powered by GoodGrafik").
  No organization name is hardcoded anywhere in `components/live/**`.
- The header, match panels, timeline, statistics, lineups, broadcast
  graphics, video monitoring, advertising, and production status were all
  redesigned toward the brief's TV-production-console direction (dark,
  dense, high-hierarchy, restrained animation) and its suggested component
  architecture.
- Two genuinely new pieces of real functionality were added (not just
  visual): a **timeline edit action** (`updateMatchEvent`) and
  **confirmation dialogs** for destructive actions (End Match, Undo Last
  Action) — both explicitly required, neither existed before.

## 2. Files created

**Branding & shared primitives**
`lib/branding.ts` (rewritten, see below) ·
`lib/match-clock.ts` · `lib/lineup-status-display.ts` ·
`components/live/BrandBar.tsx` · `components/live/LiveStatusBadge.tsx` ·
`components/live/SectionHeader.tsx` · `components/live/EmptyState.tsx` ·
`components/live/DateTimeClock.tsx` · `components/live/ConfirmDialog.tsx`

**Header & score**
`components/live/BroadcastHeader.tsx` · `components/live/MatchScorePanel.tsx`

**Timeline**
`components/live/MatchTimelineEvent.tsx` (event row, extracted from
Timeline for reuse and to hold the new edit dialog)

**Shared dialogs** (extracted so Match Events *and* the Quick Action Bar
can both open the same dialogs instead of duplicating them)
`components/live/GoalDialog.tsx` · `components/live/EventDialog.tsx`

**New panels**
`components/live/BroadcastGraphicCard.tsx` ·
`components/live/AdvertisingPanel.tsx` ·
`components/live/ProductionStatusPanel.tsx`

**Actions**
`undoLastEvent`, `updateMatchEvent` added to `app/live/[matchId]/actions.ts`
(existing actions in that file unchanged)

## 3. Files modified

`app/live/page.tsx`, `app/live/[matchId]/layout.tsx`,
`app/live/[matchId]/page.tsx` (reassembled around the new layout) ·
`components/live/MatchHeaderPanel.tsx` (trimmed to a context card now that
score has its own panel) · `components/live/Timeline.tsx` (grouping +
delegates rows to MatchTimelineEvent) · `components/live/ScoreControl.tsx`,
`components/live/EventControls.tsx` (simplified to use the extracted
dialogs) · `components/live/QuickControlsBar.tsx` (full button set:
Goal, Yellow/Red Card, Substitution, VAR, Penalty, Additional Time, Half
Time, End Match with confirmation, Undo with confirmation) ·
`components/live/StatisticsPanel.tsx` (added xG, Passes, Pass Accuracy,
Saves) · `components/live/TeamPanels.tsx` (real submission-status badges,
UTC-sync placeholder) · `components/live/LiveVideoPanel.tsx` → dual
Program/Preview monitors · `components/live/BroadcastPanel.tsx` →
categorized Pre/In/Post-Match graphics control · `lib/live-match.ts`
(bundle now includes lineup `status`) · `app/admin/layout.tsx`,
`app/admin/matches/page.tsx` (label only: "Live Center" →
"Broadcast Control Center")

## 4. Components reused (not duplicated)

Per the brief's explicit instruction not to build a second system: the
entire Sprint 2 data layer (`getLiveMatch`), all Sprint 2 server actions
except the two additions above, `Modal.tsx`, `CenterTabs.tsx`,
`HighlightsIndex.tsx`, and — across module boundaries —
`lib/team-theme.ts` (the Coach Portal's per-team color hashing, now also
used to color-band Timeline events by team) and `LineupStatus`/
`MatchEventType`/`MatchLiveStatus` from the existing `lib/types.ts`
(extended, not replaced).

## 5. Data & types

No `any` in any new or modified file in `components/live/**`,
`app/live/**`, or the new `lib/` files (verified — see §9). New types:
`BrandingConfiguration` (`lib/branding.ts`), `GraphicStatus`
(`BroadcastGraphicCard.tsx`), plus the return type of `deriveMatchClock`.
Existing types (`MatchLiveStatus`, `MatchEventType`, `LineupStatus`,
`Match`, `MatchEvent`) were extended where needed, not duplicated.

Mock/placeholder data is isolated at the top of each panel file as a
named constant (`PLACEHOLDER_STATS`, `SYSTEMS`, `SLOTS`, `CATEGORIES`) —
swapping in real data later means replacing that one constant with a
fetch; no presentation component needs to change shape.

## 6. Remaining placeholders (honest inventory)

- **Statistics** — all values static (brief: "may use placeholder values").
- **Broadcast Graphics** — "Live" state is local component state only;
  Take/Hide don't call vMix or anything external.
- **Video Monitoring** — no real video; Program/Preview monitors show
  "No source connected." Fullscreen is the one genuinely functional
  control (real browser Fullscreen API, involves no video).
- **Advertising** — static sample slots, no rotation/scheduling logic.
- **Production Status** — Database and Match Data are truthfully
  "Connected" (this page only renders because they are); Graphics/vMix/
  UTC/Stream/Recording are truthfully not.
- **Formation, player Position** — no data exists for either (Sprint 1
  explicitly has no position field); shown as "—", not fabricated.
- **Assist** — no `assist_player_id` column was added (would be a schema
  change judged not "absolutely necessary" for this sprint). Folded into
  the existing free-text description/note field instead
  (e.g. "Assist: J. Louis") — visible on the timeline, not a structured
  field a future stats query could aggregate on.
- **Additional Time quick action** — reuses the existing `var` event type
  with a distinguishing label/note rather than adding a new enum value.

## 7. Technical debt / risks

- The **event minute is free text**, so "Additional Time" and "VAR" events
  are stored under the same `type: 'var'` and are only distinguished by
  their dialog label and description at entry time — a future sprint
  wanting to query "how many VAR reviews happened" separately from
  "how much stoppage time was announced" would need a real schema split.
- **Match clock is derived, not authoritative** — `lib/match-clock.ts`
  infers the displayed minute from the latest timeline event, not a real
  ticking clock anchored to a stored kickoff timestamp. This was a
  deliberate no-schema-change choice; it means the clock only updates when
  an operator logs an event, not every second.
- **Broadcast Graphics "Live" state resets on page reload** (component
  state, not persisted) — acceptable for a placeholder, but a real
  integration would need this to be server state.
- The admin nav label "Broadcast Control Center" is long for the
  admin top nav's compact link row; acceptable but worth revisiting
  visually in a future pass.

## 8. Confirmations (per the brief's requested deliverables)

1. ✅ **Authentication was not changed.** `git diff --stat` against
   `app/admin/login/`, `app/team/[token]/login/`, `lib/coach-auth.ts`, and
   `middleware.ts`'s auth logic shows only the pre-existing `/live`
   coverage added in Sprint 2 — nothing altered this sprint. Confirmed via
   `git diff --stat` at the end of this session, output empty for all four.
2. ✅ **Existing working behavior preserved.** Coach Portal
   (`app/team/[token]/actions.ts`, submission logic) and
   `supabase/schema.sql` are untouched — confirmed the same way.
3. ✅ **Interzone represented as 11v11.** Nothing in this sprint assumed a
   fixed non-11 squad size — Starting XI is always rendered from
   `lineup.starting_xi` (an array, unbounded in the UI) and Bench from
   `lineup.substitutes`; both come from Sprint 1's real lineup-submission
   data, which already enforces exactly 11 starters at submission time.
4. ✅ **Branding is dynamic.** `lib/branding.ts`'s `BrandingConfiguration`
   is read by every panel that shows branding; nothing reads an env var or
   hardcodes a name directly outside that one file.
5. ✅ **"Powered by GoodGrafik" is permanent.** `poweredByName` is typed as
   the literal `"GoodGrafik"` (not a configurable string) and rendered by
   `BrandBar`, which every branding surface uses.
6. ✅ **No real vMix, UTC, streaming, or advertising logic implemented.**
   Confirmed by inspection of `BroadcastPanel.tsx` (local state only, no
   network calls), `LiveVideoPanel.tsx` (no `<video>` element, no stream
   URL anywhere in the codebase), `AdvertisingPanel.tsx` (static array,
   no scheduling logic).

## 9. Build, lint, and TypeScript-check results

This sandbox has no network access, so a live `npm install && npm run
build` isn't possible here (documented in earlier sprints' delivery notes
too). What was actually run, every time a batch of files changed:

- **Structural static analysis** (custom script): brace/paren/bracket
  balance and import-path resolution across all 99 project files —
  **clean**, zero issues, on the final pass this sprint.
- **`"use client"` directive audit**: every file using React hooks or
  DOM event handlers checked for the directive — **clean**.
- **`any`-usage audit**: `grep` across every new/modified file in
  `components/live/**`, `app/live/**`, `app/api/live/**`, and the new
  `lib/` files — **zero occurrences** (one pre-existing `any` in
  `app/live/page.tsx`, predating this sprint, was found and fixed anyway).
- **Constraint diff**: `git diff --stat` against `supabase/schema.sql`,
  `app/team/[token]/actions.ts`, `lib/coach-auth.ts`, and the admin/coach
  login action files — all empty, confirming no unintended changes.

The `.github/workflows/ci.yml` workflow added in an earlier sprint (npm
install → lint → `tsc --noEmit` → `next build`) will run this exact
verification with full network access on the next push, and should be
treated as the authoritative build/lint/type-check result once pushed.

## 10. Acceptance criteria — self-check against the brief

- Upgraded, not rebuilt: ✅ (§4 above)
- Visible name is Broadcast Control Center: ✅
- Resembles a professional TV production console: ✅ (dark, dense,
  layered panels, restrained animation — see design tokens reused from
  the existing `ink`/`amber-signal` palette plus new white-on-black
  broadcast surfaces)
- Desktop/tablet/mobile: ✅ — the 3-column control/video/timeline row and
  2-column tab row both collapse to a single column below `lg`; all
  buttons and cards use touch-sized targets (`py-2.5`+) throughout
- Interzone as 11v11: ✅ (§8.3)
- Timeline significantly improved: ✅ team color/logo, period grouping,
  edit action, per-type icons
- Statistics clearly comparable: ✅ comparison bars, numeric labels,
  team abbreviations, unchanged from a working pattern, extended
- Broadcast graphics organized/production-friendly: ✅ categorized tabs,
  Take/Hide, single-live-item constraint
- Lineups support eleven starters: ✅ (§8.3)
- Video monitoring clearly a placeholder: ✅ "No source connected" +
  "Live video integration coming later" badge, no embedded video
- Advertising clearly a placeholder: ✅ static states, explicit
  "no billing/rotation logic" badge
- Branding changes by competition/organization: ✅ (§8.4)
- MTK as production partner, not permanent identity: ✅ — the type
  distinguishes `organizationName` from `productionPartnerName`; neither
  is hardcoded to "MTK" or "Interzone" anywhere in the module
- Powered by GoodGrafik visible: ✅ (§8.5)
- Auth untouched: ✅ (§8.1)
- Existing behavior preserved: ✅ (§8.2)
- No unnecessary dependency/rewrite: ✅ — zero new npm dependencies added
  this sprint; every new file is either a component or a `lib/` module
  using only what was already installed (`lucide-react`, already present)
- Builds without TypeScript errors: see §9 — verified as far as this
  sandbox allows; authoritative check is the CI workflow on next push
- No obvious horizontal overflow on mobile: all new grids use
  `overflow-x-auto` where content can exceed width (filter tabs, quick
  action bar) and `grid-cols-1` bases with responsive breakpoints
  elsewhere
- Placeholders don't falsely claim connectivity: ✅ (§6, §8.6)
