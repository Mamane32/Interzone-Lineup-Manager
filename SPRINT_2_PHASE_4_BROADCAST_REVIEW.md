# GGSP — Sprint 2, Phase 4: Broadcast Ecosystem Review

Review only — no code changed. Every claim below is grounded in the actual
current files, not memory of what was intended when they were built.
Structured as the seven deliverables requested, each covering all ten
review-scope areas where relevant.

---

## 1. Architecture Review

### What already exists and is sound

- **The event pipeline is real, not decorative.** `EventControls`/`QuickControlsBar`
  both funnel into the exact same three Server Actions
  (`addGoalEvent`, `addMatchEvent`, `setLiveStatus` in `app/live/[matchId]/actions.ts`),
  which is the frozen `Domain Engine → AutomationPipeline → BroadcastEngine → VMixEngine`
  chain built earlier this sprint. Two entry points, one system — this is
  the "quick access, not a second implementation" pattern working exactly
  as designed.
- **The Graphics dispatch layer already exists and is waiting.** `lib/broadcast/GraphicsEngine.ts`
  exports real `takeGraphic()`/`hideGraphic()` functions that call
  `AutomationPipeline.run({ kind: "graphic.take"/"graphic.hide", ... })` —
  the exact same dispatch path Goals/Cards/Subs already use. Its own doc
  comment states plainly: *"nothing persists a 'live graphic' anywhere...
  they exist now so that when Broadcast Graphics gets real server-tracked
  state, wiring it to actually reach vMix is calling these two functions,
  not designing a new dispatch path."* This is the single most
  implementation-ready piece of Phase 4 — the architecture is done, only
  the UI needs to call it.
- **`BroadcastCommand` is already system-agnostic** (`lib/broadcast/types.ts`) —
  `graphic.take`/`graphic.hide` sit alongside `event.goal`/`event.card` in
  the same union. A future OBS/Ross engine gets graphics support for free.
- **Formation Engine layering (Phase 2/3) is the template to repeat.**
  Engine → permission boundary → role shell → shared rendering layer,
  proven twice now (Admin/Broadcast, then Coach). Match Operations and
  Graphics should follow the identical shape, not invent a new one.

### What's duplicated — and what only looks that way

- **`EventControls` (left panel) and `QuickControlsBar` (bottom bar) are
  two entry points into identical logic, not duplicated logic.** Both
  render buttons that open the same `GoalDialog`/`EventDialog` and call
  the same actions. This is intentional (documented in `QuickControlsBar`'s
  own comment) and is *not* a problem to fix — real broadcast consoles
  routinely offer a fast bar and a fuller panel for the same actions.
- **Real duplication, worth fixing:** `QuickControlsBar`'s "Additional
  Time" button (`EVENT_ACTIONS`, line 24) is wired to `type: "var"` —
  identical to the VAR button two entries above it. Clicking "Additional
  Time" today logs a VAR review, not additional time. This is a live bug,
  not a design choice.
- **Coverage gap, not duplication:** `QuickControlsBar` has no shortcut
  for **Extra Time** or **Penalty Shootout** at all — those two match
  statuses exist only in `StatusControls`' full stage list. An operator
  extending a match to penalties has to leave the quick bar to do it.

### Branding — the data already exists, the branding layer doesn't read it

`organizations.logo_url` and `competitions.logo_url` are both real,
populated-in-the-admin-form columns (migration 006). `lib/branding.ts`'s
`BrandingConfiguration` has an `organizationLogoUrl` field and a
`competitionLogoUrl` field — but `withCompetition()` never sets
`competitionLogoUrl` from the real competition row, and nothing calls
`getBaseBranding()` with the organization's real logo either (it only
reads an env var, `NEXT_PUBLIC_BROADCAST_ORG_LOGO_URL`). The plumbing for
"League: LFP, Competition: Interzone, both logos, plus GoodGrafik" is
almost entirely already there — it's a wiring gap, not a missing feature.

---

## 2. Product Review

Assessed as: does this feel like a live TV production tool, or an admin
panel wearing a dark theme?

| Area | Verdict |
|---|---|
| Match Header / Score | Reads as broadcast — compact, high-contrast, score-forward. |
| Match Controls (status/score/events) | Functionally correct but visually a form — three stacked panels of buttons and text inputs, not a control surface. |
| Quick Controls Bar | The closest thing to a real console today — large tap targets, sticky positioning, correct instinct. Undermined by the Additional Time bug and missing Extra Time/Penalties. |
| Video Monitoring | Correctly, honestly placeholder — reads as "we know what a real one looks like," not fake. |
| Broadcast Graphics | Genuinely well-designed interaction (categorized, Take/Hide, one-live-at-a-time) — let down only by not being connected to anything real yet. |
| Statistics / Advertising | Honestly placeholder, appropriately deprioritized. |
| Tactical Formation | Already broadcast-composed (Visualizations/Animation/vMix Export tabs) — the most "TV-graphics-ready" part of the whole product today. |
| Navigation | The weakest link — see UX Review. |

**Overall:** individual panels increasingly read as broadcast-grade; the
thing holding the whole page back from feeling like an "operating system"
is the *seams between panels* — navigation, minute entry, and branding —
not any single panel's own design.

---

## 3. UX Review

**Manual minute entry — the question asked directly.** Every event dialog
(`GoalDialog`, `EventDialog`) is a free-text input, `placeholder="e.g. 63"`
or `"e.g. 45+2"`, with zero validation beyond "not empty." An operator can
type `abc`, `999`, or `45+99` and it will save. There is no relationship
between the match's actual `live_status` (first_half, second_half, etc.)
and what minute is even plausible — nothing stops logging a "12th minute"
event while the match is in `full_time`. This is real operator friction
(retyping "45+2" for the fourth stoppage-time event of the half) and a
real data-integrity gap, not just a convenience question.

**Hidden action: Venue/Referee edit is behind a closed `<details>` disclosure**
(`MatchHeaderPanel.tsx`) — "Edit venue / referee" has to be noticed and
clicked before the form even appears. Low-frequency action, so hiding it
is defensible, but it's easy to miss entirely on first use.

**No permanent way back to the Broadcast Overview.** `BroadcastHeader.tsx`'s
only way back to `/live` (the match list) is a small text link
("← Broadcast Control Center") in the top-left — exactly the "Back
navigation" friction you flagged. There's no persistent branded mark
(a "GG" shortcut) anywhere in the Broadcast workspace's chrome.

**Moving between Broadcast modules requires the browser back button or
retyping the URL.** Formation, Readiness, Report, and the main Control
Room are four separate routes (`/live/[matchId]`, `/formation`,
`/readiness`, `/report`) with **no shared tab/nav bar connecting them** —
each page's header is built independently. An operator on Formation who
wants to check Readiness has no in-page link to it.

**Tactical Formation presentation** (already reviewed in depth during
Phase 2/3): pitch, spacing, and player tokens are solid and reused
correctly across Editor/Visualizations/Animation/Broadcast Preview. Two
real gaps for broadcast readiness specifically: the pitch is fixed at
`max-w-xl` regardless of viewport, so on a wide production monitor it sits
small and centered with large empty margins either side; and there is no
"both teams on one pitch" view — broadcast graphics like a full team-vs-team
lineup graphic would need two independent formations composited, which
today requires switching tabs, not a single view.

---

## 4. Technical Risks

- **Free-text minute entry is a silent data-quality risk**, not just a UX
  one — nothing downstream validates it, and `minuteSort`/`groupByPeriod`
  (`Timeline.tsx`) both parse it with plain `Number()` — a malformed value
  (`"abc"`) becomes `NaN` and silently sorts/groups incorrectly rather than
  erroring visibly.
- **Wiring Graphics to `takeGraphic()`/`hideGraphic()` has a real design
  question attached, not just plumbing:** doing so means graphics state
  becomes server-tracked and shared across every viewer of the page (the
  same principle Sprint 1 established for match status). That's almost
  certainly correct, but it's a real behavior change from today's
  per-browser-tab local state, worth confirming explicitly rather than
  discovering after the fact.
- **True Preview/Program on a second monitor is a bigger architectural
  ask than "add a component."** Nothing in this codebase today opens a
  second window or serves a distinct route meant for an external display —
  every page assumes one operator, one screen. Supporting a real second
  monitor means either (a) a second route rendering a stripped-down
  "output-only" view that the operator opens in a separate browser window
  pointed at a second display, synchronized via the same data Supabase
  already provides (low risk, no new dependency), or (b) genuine
  cross-window communication (`BroadcastChannel`/`postMessage`) if the two
  windows need to affect each other beyond shared data (more novel, more
  risk). Worth deciding which is actually needed before scoping.
- **No regression tests exist for any of Match Operations or Graphics** —
  consistent with the gap the Enterprise Readiness Review already flagged
  for the broadcast engine generally. Whatever ships in Phase 4 should not
  repeat that gap given how central this area is.

---

## 5. Dependency Review

Encouragingly, **nothing reviewed here requires a new dependency**:

- Smarter minute entry (presets, validation) — pure UI + existing engine, no new package.
- Fixing the Additional Time bug, adding Extra Time/Penalty shortcuts — trivial, no dependency.
- Wiring Branding to real `organization.logo_url`/`competition.logo_url` — already-fetched data, `next/image` already in use everywhere else.
- Wiring Graphics Take/Hide to the real engine — the dispatch functions already exist.
- A second "output" route for external-monitor Preview/Program — plain Next.js routing; `BroadcastChannel` if needed is a browser built-in, no package.
- Persistent shared nav across Broadcast modules — component composition, no dependency.

**Would require a new dependency, out of scope unless explicitly requested:**
real video ingest/streaming for Program/Preview (a genuine streaming
library or embed), and any future PNG/PDF graphics export (already
discussed and deferred in the Sprint 2 kickoff's Export Ecosystem
objective, not this phase's concern).

---

## 6. Recommended Implementation Order

Sequenced so each step is low-risk and builds on the last, not by
objective number:

1. **Fix the Additional Time bug and complete Quick Controls Bar coverage**
   (Extra Time, Penalty Shootout shortcuts). Mechanical, immediate, no
   design question attached.
2. **Branding wiring** (real organization/competition logos into
   `BrandingConfiguration`, LFP/Interzone display). No architecture change,
   highest visual impact for the lowest risk — the data's already there.
3. **Match Operations: smarter minute entry.** Foundational to everything
   downstream that reads a minute (Timeline, Graphics, future Match
   Reports) — worth doing before Graphics wiring, not after.
4. **Persistent Broadcast navigation** (a shared tab bar across Control
   Room / Formation / Readiness / Report, plus the "GG" permanent shortcut
   to Overview). Fixes the biggest UX-review finding; no dependency on
   anything above it, but easier to design once minute-entry's UI patterns
   are settled.
5. **Tactical Formation broadcast-readiness polish** (pitch scaling on
   wide viewports; evaluate the "both teams" composite view). Builds on
   the already-stable Formation Engine; purely presentational.
6. **Graphics Queue wiring** (`BroadcastPanel` → real `takeGraphic()`/`hideGraphic()`).
   Do this once minute entry (step 3) is trustworthy, since graphics like
   "Goal" and "Additional Time" will want to read the same clean minute
   data.
7. **Preview/Program external-monitor architecture.** The most novel,
   least-precedented piece — do last, once the decision between "separate
   output route" vs. "cross-window messaging" is made deliberately (see
   Technical Risks) rather than under pressure from earlier steps.

---

## 7. Sprint 2 Phase 4 Proposal — decisions needed before implementation

Per the same discipline as Phases 2 and 3: here is what's being proposed,
and here is exactly where a decision from you is needed before any code is
written.

**Proposed scope, matching the order above:** fix Additional Time +
complete quick shortcuts → wire real branding → smarter minute entry →
persistent Broadcast navigation with a GG shortcut → Formation broadcast
polish → Graphics Queue wiring → Preview/Program architecture.

**Decisions needed:**

1. **Minute entry replacement.** Your own examples (Current Minute, +1,
   +2, +3, 45', 90', 90+3', Custom) describe a preset-button picker
   replacing the free-text field. Confirm that's the intended replacement
   (not, say, keeping free text but adding validation) — this affects
   `GoalDialog` and `EventDialog` identically, so it's one decision, not two.
2. **Graphics Queue: transient or persisted?** Wiring `BroadcastPanel` to
   the real engine raises the question the engine's own comment doesn't
   answer: should "what's live/queued" be tracked only in memory per
   request (simplest, resets on reload), or persisted (a real queue a
   second operator or a refreshed page would see identically)? The
   `GraphicsEngine` functions work either way; this determines whether
   Phase 4 needs a schema change or not.
3. **Preview/Program: separate output route, or cross-window messaging?**
   As laid out in Technical Risks — a second route rendering an
   output-only view (lower risk, no new browser APIs) versus real
   `BroadcastChannel` cross-window communication (needed only if the two
   windows must affect each other beyond shared data). Recommend the
   former unless there's a concrete case for the latter.
4. **"Both teams on one pitch" Formation view** — worth adding to Phase 4,
   or deferred? Not required for anything else in this phase; flagged
   because it's the one Formation gap with real broadcast-graphics value
   (a real team-vs-team lineup graphic needs it).

Waiting for approval on scope and the four decisions above before writing
any code.
