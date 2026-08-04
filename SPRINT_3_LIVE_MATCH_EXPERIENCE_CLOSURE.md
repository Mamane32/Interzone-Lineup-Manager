# GGSP — Sprint 3: Live Match Experience — Closure Report

All seven phases complete. Full detail lives in each phase's own
document — this is the summary and final state.

## What shipped

| Phase | Doc | Summary |
|---|---|---|
| 1–4 (extensions) | [SPRINT_3_PHASES_1_4_EXTENSIONS.md](SPRINT_3_PHASES_1_4_EXTENSIONS.md) | Live Match Center rebuilt on real stadium/officials data; Timeline moved to a consistent icon language; the dormant vMix dispatch chain finally activated and the Production Queue's "single dispatch layer" rule enforced everywhere; keyboard shortcuts added to every Operator Shortcut. |
| 5 (subsystem) | [SPRINT_3_PHASE_5_MATCH_STATISTICS.md](SPRINT_3_PHASE_5_MATCH_STATISTICS.md) | A real, operator-driven `match_statistics` table replacing a hardcoded placeholder — nine one-click counters, possession kept zero-sum, xG reserved as schema-only. |
| 6–7 (subsystem) | [SPRINT_3_PHASE_6_PUBLIC_MATCH_CENTER.md](SPRINT_3_PHASE_6_PUBLIC_MATCH_CENTER.md) | The platform's first unauthenticated public page — `/match/[matchId]` — built from one reusable, deliberately-scrubbed read model that doubles as the seam for a future full public website. |

Two migrations applied and fully verified against the live database this
sprint: `014_match_officials.sql`, `015_match_statistics.sql` — both
through all 9 steps of the standing discipline (create, review, apply in
a transaction, verify schema, verify constraints, verify data integrity,
verify the real application code path with temporary data, remove that
data, confirm the final baseline).

## Sprint-wide decisions closed out

- **Branding**: the `organizations` table was empty — no League existed,
  and the "Interzone 2026" competition had no `organization_id`. Created
  "League Football de Port-de-Paix (LFP)" and linked the competition to
  it, so `BrandBar`'s League → Competition hierarchy (built in Sprint 2
  Phase 4) now actually has a League to show. Verified in the browser:
  the Public Match Center's header now renders correctly.
- **Image uploads**: audited for any manual URL field that slipped back
  in — none found. The one remaining `*URL` labeled input in the
  codebase (`VenueFormFields.tsx`'s "Google Maps URL") is a link field,
  not an image field, and is correctly left as-is.
- **Permanent GG/Home button**: confirmed still wired into every
  `/live/[matchId]/**` route via the shared layout, unaffected by this
  sprint's changes. The Program/Preview output surfaces and the new
  public Match Center correctly do *not* carry it — both are
  intentional, pre-existing exceptions (output-only and public-audience
  surfaces respectively), not gaps.
- **Multi-monitor**: no browser display-detection API introduced, per
  the confirmed decision — the existing pop-out workflow is the whole
  story this sprint.
- **Production Queue as the single dispatch layer for graphics**:
  actively enforced this sprint, not just maintained — Phase 3 found and
  fixed three places (`var`, `penalty_missed`, `injury`) that bypassed it
  entirely, a real latent bug from before Sprint 3 started.

## Reuse discipline

Every phase either extended an existing shared module or explicitly
justified the rare exception:
- Timeline icons reuse Operator Shortcuts' own icon choices.
- Graphics Integration reuses the Production Queue Engine's
  `enqueueAndTakeProductionItem`, itself factored out so BroadcastPanel's
  manual Take and the new automatic trigger share one implementation.
- `StatisticsPanel` gained a `readOnly` prop so the Control Room and the
  Match Report share one component instead of two.
- The Public Match Center is the one deliberate non-reuse: it does not
  import `StatisticsPanel`/`MatchTimelineEvent` because both accept full
  private `Team`/`MatchEvent` objects that would leak into a public
  page's client bundle — a security boundary, not a shortcut, and
  documented as such in that phase's own closure doc.

## Final quality gate

`npm run typecheck`, `npm run lint`, `npm run test` (129 tests, 13
files), and `npm run build` all pass clean at the end of the sprint,
after the branding data change and with no code left uncommitted to the
working tree beyond what's described above.
