# GGSP — Sprint 2, Phase 3: Coach Experience — Architecture Proposal

Per the new mandatory workflow (Architecture Proposal → Approval →
Implementation → ...), written before any Phase 3 code. Grounded in what
exists today in the Coach Portal, not assumed.

## What exists today

- **Coach identity**: token-in-URL, no password required by default
  (`lib/coach-auth.ts`'s `requireCoach(token)` — resolves the team and
  confirms the session belongs to it).
- **Coach nav** (`components/coach/BottomNav.tsx`): 4 tabs — Dashboard,
  Lineup, Calendar, Profile. No Formation tab.
- **Lineup submission** (`app/team/[token]/actions.ts`'s `submitLineup`):
  picks Starting XI/Substitutes/Captain, then locks —
  `if (lineup.locked) return { ok: false, error: "Lis la deja fèmen." }`.
  This is the exact lock-check pattern a coach-side formation save should
  mirror, per Phase 2's confirmed decision to reuse the Lineup lifecycle
  rather than invent a Formation-specific one.
- **The Formation Engine** (Phase 2, closed): `saveFormationCore()` is
  role-agnostic and ready for a second caller. `TacticalFormationBoard`
  today is Broadcast/Admin's own shell — it switches between home/away,
  and offers 5 tabs (Editor, Visualizations, Animation Preview, Broadcast
  Preview, vMix Export), none of which beyond the Editor tab make sense
  for a coach preparing only their own team.

## What Phase 3 adds

**A new coach-scoped permission-boundary action** — e.g.
`app/team/[token]/actions.ts` gains `saveTeamFormation(token, formation,
positions)`: `requireCoach(token)` resolves the team (so a coach can only
ever act on their own team — there's no team id to spoof, the token *is*
the scope), then the identical lock check `submitLineup` already uses
(`if (lineup.locked) return error`), then a single call into the same
`saveFormationCore` Admin's action already calls. No new validation, no
new persistence — the exact rules from Phase 2, applied to a second role.

**A new coach page** — `app/team/[token]/(coach)/formation/page.tsx`,
reached from a 5th `BottomNav` tab. Reads the coach's own lineup (for
Starting XI auto-placement, same as Admin's page does) and their saved
formation via the existing `getTacticalFormation`, gated the same way
every other coach page is gated.

## The one real design question: how much of `TacticalFormationBoard` does Coach reuse?

`TacticalFormationBoard` is Broadcast/Admin's shell, not the engine's
rendering layer itself — it bundles the shared pitch/drag experience
together with home/away switching and four Broadcast-only tabs. A coach
has exactly one team and needs none of those tabs. Two ways to get a
lean Coach editor without duplicating the drag-and-drop/pitch logic:

**Option A — Coach reuses `TacticalFormationBoard` directly, simplified by props.**
Pass only one team (no "away"), and a flag that hides the team-switcher
and the four Broadcast-only tabs, leaving just the pitch + formation
select + save. Fastest to build; keeps everything in one file, but that
file now needs to know it can render in two structurally different modes
(dual-team-with-tabs vs. single-team-editor-only) via conditionals — a bit
of param-driven branching in what's supposed to be one component.

**Option B — Extract the pitch/drag interaction into its own hook/component,
and give Coach and Broadcast their own thin shells composing it.**
A new `useFormationEditor` (or `FormationPitchEditor`) owns exactly what's
genuinely shared: drag state, formation-change logic, the pitch +
`PlayerToken` rendering, the save call. `TacticalFormationBoard` keeps its
team-switcher and five tabs, composing this new piece for the Editor tab
instead of owning that logic itself; a new lean `CoachFormationEditor`
composes the same piece with no switcher, no extra tabs. More faithful to
"one engine, many role shells, no duplication" as a rendering-layer
principle, not just a data/validation one — but it's a real refactor of
an already-shipped, working component, not just an additive change.

Both are legitimate; they trade "ship Phase 3 faster" against "finish the
rendering-layer separation Phase 2 started." Not deciding this here.

## Scope question: engine integration only, or also the visual polish?

The original Sprint 2 kickoff listed "Coach Experience" objectives that
are independent of the Formation Engine entirely — premium dashboard,
coach profile card, coach photo support, glassmorphism/motion polish. None
of those need the engine; they could be built whether or not Phase 3
touches formations at all. Bundling them into this phase mixes an
engine-consuming architecture change with a visual redesign that has its
own, unrelated tradeoffs (and its own "present options before committing"
questions — e.g. coach photo upload was explicitly flagged in Sprint 1 as
not yet built). Not deciding this here either.
