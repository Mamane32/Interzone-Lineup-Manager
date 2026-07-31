# GGSP — Sprint 2, Phase 3: Coach Experience

Implements
[SPRINT_2_PHASE_3_COACH_EXPERIENCE_PROPOSAL.md](SPRINT_2_PHASE_3_COACH_EXPERIENCE_PROPOSAL.md)
with both open questions resolved before implementation: extract a real
shared rendering layer (not prop-flag branching), and bundle the Formation
Engine integration together with the visual/UX polish as one complete
Coach Experience.

## 1. Shared rendering layer extraction

`components/formation/` (new, role-neutral — not under `components/live/`
anymore, since Coach is now a consumer alongside Broadcast/Admin):

- `PitchMarkings.tsx`, `PlayerToken.tsx` — moved verbatim, zero logic changes.
- `FormationPitchEditor.tsx` (new) — the actual reusable rendering layer:
  owns drag state, formation selection, the save call, Starting XI/Bench
  lists. Two escape hatches let a richer shell compose more around it
  without it knowing why: `onChange` mirrors live state upward (Broadcast's
  shell uses this to feed its Visualizations/Animation/vMix Export tabs),
  `applyExternal` lets a shell push a state change in (Broadcast's Preset
  recall) without this component knowing what a "preset" is.

`lib/formation-engine.ts` gained `buildInitialPositions()` — the
"saved formation, else auto-place from Starting XI, else empty" logic,
moved out of the old `TacticalFormationBoard` so every shell shares it
instead of reimplementing it.

`components/live/formation/TacticalFormationBoard.tsx` (Broadcast/Admin's
shell) now composes `FormationPitchEditor` for its Editor tab instead of
owning the pitch/drag/save logic itself. It kept exactly what's genuinely
its own: the home/away team switcher and the four Broadcast-only tabs.
Its production bundle size actually **shrank** (11.2 kB → 7.54 kB) —
concrete proof the shared logic moved out rather than being duplicated.

`components/coach/CoachFormationEditor.tsx` (new) — Coach's thin shell:
no switcher, no extra tabs, just the shared editor plus a lock-state
banner. 790 B.

## 2. Formation Engine integration — Coach's permission boundary

`app/team/[token]/actions.ts` gained `saveTeamFormation(token, matchId,
formation, positions)` — the second caller of `saveFormationCore`
(Admin's is in `app/live/[matchId]/formation/actions.ts`). No new
validation or persistence: `requireCoach(token)` resolves the team (a
coach can only ever act on their own team — there's no id to spoof), then
the identical lock check `submitLineup` already uses
(`if (lineup.locked) return error`), then straight into
`saveFormationCore`. Per the confirmed decision, there is no separate
Formation status/lock — a coach's formation is locked exactly when their
Lineup is.

`app/team/[token]/(coach)/formation/page.tsx` (new) — same active-lineup
selection logic as the Lineup page (`?match=` deep link, else whatever
needs attention, else most recent), reads the saved formation via the
same `getTacticalFormation` Admin's page reads, renders
`CoachFormationEditor`.

A 5th `BottomNav` tab ("Fòmasyon") reaches it.

**Security test updated**: the Coach Portal is no longer forbidden from
referencing the Formation Engine — it's a real consumer now. What's still
forbidden, and tested: importing Admin/Broadcast's own action file or
shell components (`TacticalFormationBoard`, `PresetManager`, etc.) from
`app/team/**`.

## 3. Migration 010 — coach photo, a real upload

`teams.coach_photo_url` (nullable) + a `coach-photos` public-read storage
bucket, mirroring the existing `team-logos` pattern exactly (same upload
function shape as `app/admin/teams/actions.ts`'s `uploadLogoIfPresent`).
Deliberately not an Avatar-URL text field — coaches have no way to host an
image elsewhere the way an admin typing a URL does.

`app/team/[token]/(coach)/profile/actions.ts` gained `uploadCoachPhoto` —
validates it's an image, caps size at 5 MB, uploads, updates
`teams.coach_photo_url`. `components/coach/CoachPhotoUpload.tsx` (new,
client) shows the current photo (or initials), tap-to-replace, immediate
upload on file selection.

## 4. Coach profile card + premium visual pass

`components/coach/CoachProfileCard.tsx` (new) — team-themed identity card
(photo or initials, coach name, team, competition) on the dashboard,
linking to Profile.

`app/team/[token]/(coach)/layout.tsx` — glassmorphic sticky header
(`bg-ink/85 backdrop-blur-xl` in place of a flat fill), a single
lightweight ambient background wash (team-themed gradient blur, reusing
the *existing* `animate-soft-pulse` utility — which already respects
`prefers-reduced-motion` globally — instead of introducing a second
animation primitive).

`components/coach/BottomNav.tsx` — active tab now gets a team-themed pill
background instead of only a color change, for clearer visual hierarchy;
accepts an optional `theme` prop (backward compatible — its only caller
already passes one).

## Technical validation

```
npm run typecheck   -> clean
npm run lint        -> clean
npm test             -> 116/116 passing
npm run build        -> succeeds, 46 routes (new: /team/[token]/formation)
```

## Database validation (migration 010)

Applied inside a transaction; verified column type/nullability, full
column list (nothing else changed), the new storage bucket, and all 4
existing teams' data byte-for-byte unchanged (including their real,
already-uploaded logos — confirming the mirrored upload pattern was sound
to copy). Temporary `pg` package removed afterward; `package.json`/lockfile
untouched throughout, per standing discipline.

## Product validation

Validated the Coach lock-gate against **real** production data rather
than synthetic fixtures: Jean Rabel Fc's real, currently-locked lineup
correctly blocks the save gate; temporarily unlocking it (via committed
update, since a coach's session and this project's real access pattern
both go through Postgrest, not a raw transaction) confirms the gate then
allows it through; restored to the exact original state
(`locked: true, status: "submitted"`) and verified. The underlying
save+read persistence itself was already proven end-to-end during
migration 009's validation using this same team/match — this pass
specifically covers the new lock-check logic `saveTeamFormation` adds on
top of it.

Full database state (tactical_formations, tactical_positions, matches,
teams, players, lineups counts and content) confirmed identical to
pre-Phase-3 baseline after all validation.

**Not validated in-browser**: this sandbox cannot render this project's
dev server, a limitation noted consistently throughout this engagement.
The visual/UX changes (premium header, profile card, photo upload,
animated background, nav) have not been visually confirmed and should be
checked in a real browser, mobile viewport especially, before considering
them done.
