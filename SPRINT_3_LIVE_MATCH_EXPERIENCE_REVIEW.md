# GGSP — Sprint 3: Live Match Experience — Architecture & Product Review

No implementation in this document. Written before touching code, per the
standing Sprint 2/3 discipline: wait for the architecture proposal if a
major new subsystem becomes necessary before implementing it. Grounded in
what exists today (confirmed by reading the actual files, not assumed).

---

## 1. What already exists, per scope area

| Scope area | Current state |
|---|---|
| **1. Live Match Center** | `MatchScorePanel.tsx` (score, live clock via `deriveMatchClock`, status badge) and `MatchHeaderPanel.tsx` (competition, matchday, kickoff, venue, referee — editable) already exist and are real, not placeholder. Weather is already an honest `"—"` placeholder; Attendance is already an honest `"—" / "Placeholder"` in the Match Report page — both match the brief's own "placeholder" framing exactly, nothing to build there beyond visual treatment. **Match officials** is a single `referee_name` text field — no assistant referees, fourth official, or VAR official structure exists. **Stadium information**: `venues` (Foundation, Sprint 1/2) already has capacity, city, surface type, lighting, GPS, and a real uploaded photo (`venue-photos` bucket, Sprint 2 Phase 4) — but `getLiveMatch` never joins `matches.venue_id` to it. Real stadium info already exists in the database; it's just not read into the Live Match Center yet. |
| **2. Advanced Match Statistics** | `StatisticsPanel.tsx` is **100% hardcoded** — a `PLACEHOLDER_STATS` array, explicitly labeled "Placeholder data," possession fixed at 54/46, everything else fixed at 0. No `match_statistics` table exists anywhere. Of the eleven listed stats, exactly two (Yellow Cards, Red Cards) are already derivable by counting existing `match_events` — the other nine (Possession, Shots, Shots on Target, Corners, Fouls, Offside, Saves, plus xG) have no corresponding event type or table today. |
| **3. Live Timeline** | `Timeline.tsx` + `MatchTimelineEvent.tsx` already render a real, filterable, period-grouped chronological timeline. Every event type the brief lists (Goal, Yellow Card, Red Card, VAR, Substitution, Penalty, Additional Time, Half Time, Full Time) is already a real `MatchEventType` that already renders today — this is a visual/UX polish item, not new data. |
| **4. Graphics Integration** | `lib/broadcast/AutomationPipeline.ts` already has an `AUTOMATION_RULES` array — empty today, but its own doc comment already describes exactly this: *"a future rule could read 'on event.goal, also produce a graphic.take for the Goal lower third.'"* The Production Queue Engine (Sprint 2 Phase 4) already has a registered-consumer dispatch pattern. Wiring Timeline events to the queue is populating an extension point that was already built for this, not new infrastructure. |
| **5. Broadcast Experience** | Operator UI polish is layout/CSS work over existing components. Keyboard shortcuts: zero global shortcut handling exists anywhere in the app today (confirmed by grep — the one `onKeyDown` hit in the whole codebase is a preset-name input's Enter-to-submit, unrelated). Multi-monitor: the Preview/Program pop-out links (Sprint 2 Phase 4) already give "open in a new window, drag to a second screen" — genuinely new territory is any *automatic* display detection. |
| **6. Public Match Center** | **Does not exist in any form.** Confirmed directly: `app/page.tsx` is a static marketing page with no live data binding, and `lib/broadcast/WebsiteSync.ts`'s own doc comment says so explicitly: *"There is no public results website, mobile app, or external API in this project to sync to."* Every single data-reading path in this entire app today requires `requireRole`, `requireCoach`, or the service-role client from inside an already-gated Server Component — there is no precedent anywhere for an unauthenticated visitor reading match data. |
| **7. Website Synchronization** | `WebsiteSync.ts` already exists: a real, working, empty provider registry (`REGISTERED_PROVIDERS: WebsiteSyncProvider[] = []`), exactly the extension point for "push live match state somewhere outside GGSP." Nothing registered because nothing external exists to push to yet. |

---

## 2. Classification — extension vs. major new subsystem

Per the standing rule, everything below that's a **major new subsystem**
needs its own proposal before implementation. Everything classified as
an **extension** proceeds directly, same as Decision 1/4 and the
Branding/Navigation items did in Phase 4.

- **Extensions** (proceed directly): Live Match Center's visual rebuild
  and stadium-info join; Live Timeline's visual rebuild; Graphics
  Integration (populating `AUTOMATION_RULES` — an already-built extension
  point); Broadcast Experience's layout/control polish and keyboard
  shortcuts.
- **Major new subsystems** (need a proposal first): **Advanced Match
  Statistics** (no data model exists; a real decision about manual entry
  vs. derived-from-events vs. hybrid changes the shape of a new table and
  a new logging UI) and **Public Match Center** (the first unauthenticated
  read path in the project — a real security-boundary decision, not a UI
  task, exactly the category Preview/Program's Realtime question fell
  into last phase).
- **Needs a product decision before it can be classified at all**:
  Website Synchronization's actual scope depends entirely on whether "the
  public website" means the Public Match Center this same sprint is about
  to build, or a genuinely separate external site — see Section 4.

---

## 3. Recommended phase order

1. **Live Match Center rebuild** (extension) — score/clock/status polish,
   join real `venues` data via `match.venue_id`, structured match
   officials (pending Section 4's decision), Weather/Attendance kept as
   polished placeholders.
2. **Live Timeline rebuild** (extension) — visual pass over the existing,
   already-correct data.
3. **Graphics Integration** (extension) — populate `AUTOMATION_RULES` so
   logging a match event can enqueue+take its graphic automatically,
   reusing Sprint 2 Phase 4's Production Queue Engine exactly as designed.
4. **Broadcast Experience polish** (extension) — layout/control pass +
   keyboard shortcuts.
5. **Advanced Match Statistics** (proposal, then implementation) —
   architecture proposal first, per Section 4.
6. **Public Match Center** (proposal, then implementation) — architecture
   proposal first, per Section 4.
7. **Website Synchronization** — scope depends on Section 4's answer;
   likely folds substantially into Phase 6 rather than being fully
   separate work.

This mirrors Phase 4's own order: extensions first (fast, low-risk,
immediately visible improvement), proposals for the two genuine new
subsystems before they're touched.

---

## 4. Tradeoffs and decisions to make before implementation starts

**A. Match officials structure.** Today: one `referee_name` text field.
"Match officials" (plural) implies assistant referees / fourth official /
VAR official. Three options, increasing in cost:
- Keep it single-referee, just visually promoted (no schema change).
- Add 2–3 more nullable text columns to `matches` (`assistant_referee_1`,
  `assistant_referee_2`, `fourth_official`) — cheap, but rigid if the
  list of official roles ever needs to grow or vary by competition.
- A small `match_officials` table (match_id, role, name) — more setup,
  but open-ended without a future migration.
Recommendation: the column approach — officiating crews in most
competitions this platform serves are a fixed, small set of roles, and a
new table is more architecture than the data shape needs today.

**B. Advanced Match Statistics — the real design question.** Not "what
should the UI look like" (that's straightforward) but "where do these
numbers come from during a live match." None of Possession, Shots, Shots
on Target, Corners, Fouls, Offside, or Saves exist as loggable events
today. Recommendation, to be detailed fully in that phase's own proposal:
a `match_statistics` table with one row per (match, team) that the
operator updates live via quick +/- controls — matching this project's
established one-click philosophy — rather than deriving stats from
event-logging (which would require adding new `MatchEventType`s for
"shot," "corner," "foul," etc., conflating "things worth a timeline
entry" with "things worth a counter"). xG gets a column reserved and
displayed as "—" until a real calculation exists — schema only, exactly
as the brief asks.

**C. Public Match Center's audience and access model.** Before any code:
who can reach it (anyone with the match's URL, or does it need to be
discoverable from a public competition/fixtures list that doesn't exist
yet either), and does it need to work for matches that haven't gone live
yet (pre-match, a "coming up" state) or only live/finished ones. This
determines the route structure and what "public" actually has to mean
here — not just a permissions detail.

**D. Website Synchronization vs. Public Match Center.** If "the public
website" in item 7 *is* the Public Match Center being built in item 6 (a
public page inside this same Next.js app), there is no separate "sync"
architecture to design — a Server Component reading match data straight
from the service-role client already satisfies "consume live match
updates without redesigning the current data model." If it means a
genuinely separate, externally-hosted site, `WebsiteSync.ts`'s existing
provider pattern is the right extension point (a small public read API
a real provider could call), which is real but much smaller work.
Which of these is meant changes Phase 6/7's scope substantially.

**E. Multi-monitor awareness — how far.** The pop-out Program/Preview
links (already shipped) satisfy "an operator can put Program on a second
screen." A materially bigger version — automatically detecting connected
displays and placing windows without a manual pop-out — would use the
browser's Window Management API, which is experimental, permission-
gated, and not supported in every browser. Recommend treating "multi-
monitor awareness" as "the existing pop-out workflow, made more
discoverable in the new Broadcast Experience layout" unless a specific
auto-placement requirement is intended.

---

## Decisions needed before implementation starts

1. Match officials: column approach (recommended) or a separate table?
2. Advanced Match Statistics: confirm the manual-entry-table approach
   (Section 4B) as the direction for that phase's own proposal.
3. Public Match Center: confirm audience/access model (Section 4C) —
   link-only vs. requires a public fixtures list; live-only vs. also
   pre-match/finished.
4. Website Synchronization: is "the public website" this sprint's new
   Public Match Center, or a separate external site (Section 4D)?
5. Multi-monitor awareness: confirm the existing pop-out-window model is
   sufficient, or is real display auto-detection actually wanted?
