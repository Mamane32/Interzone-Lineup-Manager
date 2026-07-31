# GGSP — User Acceptance Testing Guide

Prepared for tonight's testing session. Everything below is verified against
your actual database (read-only queries, nothing was created or changed) —
not assumptions. Re-verified again just now: your data hasn't changed since
the first pass — same 3 teams, same 1 match, same lineup states.

---

## 1. Admin Test Access

### Your account is already an administrator — no setup needed

```
Email:  darodebass@gmail.com
Role:   super_admin (active)
```

This was confirmed directly against `profiles` / `user_access_assignments` —
you already have a real, active `super_admin` assignment. **Log in at
`/login` with your existing password.** Nothing to create.

### How to create a new administrator — exact process

There is no in-app "create admin" flow by design (see `README.md`) — every
administrator is provisioned the same three-step way:

1. **Supabase Auth step** — Supabase dashboard → Authentication → Users →
   **Add user** → enter an email + password. This creates the `auth.users`
   row, which is the actual login identity.
2. **Supabase dashboard** → Authentication → Providers → Email → confirm
   "Allow new users to sign up" is **off** (prevents public self-registration
   — the only way in is this manual process).
3. **Required database records** — SQL Editor, run (replace the email):
   ```sql
   insert into profiles (id, email, status)
   select id, email, 'active' from auth.users where email = 'admin@example.com'
   on conflict (id) do nothing;

   insert into user_access_assignments (user_id, role_key, status)
   select id, 'super_admin', 'active' from auth.users where email = 'admin@example.com';
   ```

Required records, permissions, and organization assignment, explicitly:
- **Supabase Auth user** (`auth.users`) — the login identity, step 1 above.
- **`profiles` row** — `status = 'active'`, or every protected route redirects to `/login?error=no-access`.
- **`user_access_assignments` row** — `role_key = 'admin'` or `'super_admin'`, `status = 'active'`. This is the actual permission grant; `admin` and `super_admin` are functionally equivalent everywhere except super_admin-only actions (managing another super_admin, protecting the last super_admin from lockout).
- **Required permissions** — granted entirely by `role_key`; there is no separate permissions table. `admin`/`super_admin` get full platform access; `broadcast_operator` (used elsewhere) is scoped to `/live/**` only.
- **Organization assignment** — **not applicable today.** `user_access_assignments` has no `organization_id` column yet (documented gap, see §6 Known Limitations); access is platform-wide once `admin`/`super_admin` is granted. Your `organizations` table is currently empty (0 rows) — nothing to assign to yet.
- **Example login credentials** (illustrative only, matching `README.md`'s own convention): `admin@example.com` / a password you choose in the Supabase dashboard. I did not generate or store a real password anywhere — you set that directly in Supabase in step 1.

---

## 2. Coach Test Access

Coaches authenticate via an **unguessable token in the URL** — no username/password required for the base flow (an optional email+password upgrade exists via "Send coach login invite" but **none of your 3 teams have used it** — `coach_email` is `null` on all three, confirmed against the database). Tonight, use the token links directly.

**No expiration exists.** `teams.token` has no expiry column or logic anywhere in the code — the link is valid indefinitely until you regenerate it (there's no regenerate function either; the token is set once at team creation).

### Real teams in your database right now

| Team | Coach URL | Token | Expiration | Squad size |
|---|---|---|---|---|
| Jean Rabel Fc | `http://localhost:3000/team/86su7bA4` | `86su7bA4` | None | 12 players — **only team with a full squad** |
| Kriminal Fc | `http://localhost:3000/team/3AvgsxtM` | `3AvgsxtM` | None | 0 players registered |
| MTK | `http://localhost:3000/team/AZoKPUsZ` | `AZoKPUsZ` | None | 0 players registered |

If you're testing against a deployed URL instead of local, replace
`http://localhost:3000` with your real domain — everything else is
identical. (`NEXT_PUBLIC_APP_URL` is currently set to `http://localhost:3000`
in your `.env.local`.)

### Where tokens are generated

Not a separate "generate" step — every team gets one automatically at
creation (`lib/token.ts`'s `generateTeamToken()`, called inside
`createTeam` in `app/admin/teams/actions.ts`). To find or share an existing
one:

1. Admin → **Teams** (`/admin/teams`) → open the team.
2. The **Copy Link** button on that page copies the exact `/team/<token>` URL — this is the same URL shown in the table above.

### How to send this to a real coach

Exactly as `README.md` describes: copy the link (button above, or a
WhatsApp-share shortcut is built into the same page) and send it directly —
SMS, WhatsApp, email, however you'd normally reach them. Opening it shows
that team's landing page with a "Login" button into the Coach Portal; no
account creation on their end.

---

## 3. Portal Directory — Exact URLs

All under `http://localhost:3000` (swap for your deployed domain if testing production).

| Portal | URL |
|---|---|
| Admin Login | `/login` (unified login) — `/admin/login` also still works |
| Admin Dashboard | `/admin/dashboard` |
| Competition Management | `/admin/competitions` — plus `/admin/organizations`, `/admin/seasons`, `/admin/divisions`, `/admin/stages`, `/admin/groups`, `/admin/venues` |
| Teams | `/admin/teams` |
| Players | **No standalone `/admin/players` route.** Players are managed inside a team's own page: `/admin/teams/[id]` |
| Matches | `/admin/matches` |
| Lineups | `/admin/lineups` |
| Coach Portal | `/team/[token]` — see §2 table for your 3 real links |
| Broadcast Center | `/live/9b85ad3d-1a12-4632-8749-6d299fed6e2d` |
| Mission Control | **Not a separate URL.** It's the live match-state grid inside the Broadcast Operations Center page below |
| Tactical Formation | `/live/9b85ad3d-1a12-4632-8749-6d299fed6e2d/formation` |
| Broadcast Readiness | `/live/9b85ad3d-1a12-4632-8749-6d299fed6e2d/readiness` — this one page is the Broadcast Operations Center, and contains both Mission Control and the Readiness scoring together |
| Settings | `/admin/settings` |

Two rows above are called out because the names don't map 1:1 to routes —
**Mission Control** and **Broadcast Readiness** are sections on the *same*
page, not two different URLs, and **Players** has no dedicated admin page of
its own. Documenting that honestly rather than inventing routes that don't
exist.

The long ID above is your **one real match right now** — Jean Rabel Fc (home)
vs Kriminal Fc (away), currently `live_status = first_half` in the database
(left mid-game from prior work this session). Use it directly, or go through
`/admin/matches` → "Live Center" on any match to get a fresh matchId.

---

## 4. Profile Management

**Photo *upload* (a file picker) does not exist. Stating that clearly, not faking it.**

What exists instead, real and working end-to-end: an **Avatar URL** field.
You paste a link to an image already hosted somewhere else, and it's saved
for real — a genuine `UPDATE` to `profiles.avatar_url`, verified in
[`app/admin/settings/actions.ts`](app/admin/settings/actions.ts) — no file
storage bucket, no upload button, no image processing anywhere in the
codebase.

### How to change it today

1. `/admin/settings` → **Profile** section (top of the page).
2. Paste any public image URL into the **Avatar URL** field (e.g. an image
   you've already uploaded somewhere like Imgur, or a Supabase Storage
   public URL if you set one up manually).
3. **Save profile** → the avatar updates immediately in the sidebar and
   settings page, and an audit event (`user.profile_updated`) is recorded.

There is no crop tool, no drag-and-drop, no direct-to-storage upload widget.
If you want real file uploads, that's a defined future feature (a Supabase
Storage bucket + an `<input type="file">` + upload handler) — not built yet.

---

## 5. Test Checklist

Real starting state noted next to each item so you know what to expect —
nothing here should surprise you as "broken" if it matches.

**Login**
- [ ] Login at `/login` with your super_admin account
- [ ] Confirm it lands on `/admin/dashboard` directly (single assignment, no picker)
- [ ] Logout (top-right profile menu → Sign out)
- [ ] Confirm `/admin/dashboard` redirects to `/login` once logged out

**Competition**
- [ ] Competition Management → confirm **Interzone 2026** appears (your only competition)
- [ ] Organizations page → expect **empty** (0 rows today — not a bug)

**Teams**
- [ ] Teams → confirm Jean Rabel Fc, Kriminal Fc, MTK all appear

**Players**
- [ ] Open Jean Rabel Fc's team page → confirm 12 players listed
- [ ] Open Kriminal Fc or MTK's team page → confirm 0 players (accurate, not a bug)

**Matches**
- [ ] Matches → confirm the one real match appears

**Coach Portal**
- [ ] Open the Jean Rabel Fc coach link → confirm the team landing page and Login button work

**Starting XI**
- [ ] Jean Rabel Fc's lineup should already show **Submitted**
- [ ] Kriminal Fc's lineup is currently **Needs Correction**, not submitted — good test case for that status specifically

**Tactical Formation**
- [ ] Jean Rabel Fc should auto-place from its submitted XI; Kriminal Fc will show the "no Starting XI" empty state (accurate — it has none)
- [ ] Try all 9 presets + Custom, drag a player, save, reload and confirm it persisted

**Broadcast Center**
- [ ] Open the Broadcast Center URL — confirm score, team panels, and header render
- [ ] Broadcast Preview tab → confirm the TV-graphic-style card renders with your branding
- [ ] Animation Preview → try at least 2 of the 6 named styles

**Mission Control**
- [ ] Open Broadcast Readiness URL → confirm the Mission Control grid renders live match state

**Readiness**
- [ ] Confirm a score renders (expect **well under 100%** right now — no formation saved yet for either team, Kriminal Fc has no XI, vMix/Website Sync are unconfigured by design)
- [ ] Confirm each warning shown has a working "→ Open ___" link that lands on the right screen

**GO LIVE**
- [ ] Confirm the button is disabled and lists the correct blocking requirements (expected, given the state above)

**Timeline**
- [ ] Production Timeline → confirm "Match Created" appears at minimum

**Logout**
- [ ] Logout from within `/live/**` and confirm it also redirects correctly

---

## 6. Known Limitations — nothing hidden

**Placeholder (static data, no backend yet):**
- Statistics Panel — all values static
- Broadcast Graphics panel — local component state only, resets on refresh, never persisted
- Advertising panel — static sample slots, no rotation logic
- Video Monitoring (Program/Preview) — "No source connected" always; no real video anywhere in the app

**Not Implemented — architecture only, explicitly by your own instruction:**
- vMix — real HTTP client exists (`lib/vmix/`), reports honest "Not Configured" since no `VMIX_HOST` is set anywhere; no live instance has ever been connected
- Website Sync — real provider interface exists, **zero providers registered** — always reports "Not Configured"
- Profile photo upload — see §4; only a manual Avatar URL field exists today
- GO LIVE button — gates on readiness correctly; pressing it when enabled does not start any broadcast action (explicitly deferred)

**Planned:**
- Post Match / Archived match phases — shown as "Planned" in the lifecycle stepper, not real `matches.live_status` values
- Future Automation hooks (Auto Start Broadcast, Auto Publish Starting XI, etc.) — documented only, none execute
- Real file-upload avatars (Supabase Storage bucket + upload widget)
- Organization-scoped access (`user_access_assignments.organization_id`) — column doesn't exist yet

**Future Architecture (designed, deliberately not wired):**
- Multi-provider Website Sync (interface supports many providers; none registered)
- Pluggable production systems beyond vMix (`BroadcastSystemEngine` interface is provider-agnostic by design)

**Structurally always-passing (not bugs if they never show a warning):**
- Team Colors — auto-derived per team, cannot be "missing"
- Coach Information — required fields at team creation, cannot be blank
- Competition Branding — always has a fallback name

**Known data gaps in your environment tonight (not app bugs):**
- Organizations: 0 rows
- Kriminal Fc and MTK: 0 players registered — Starting XI/Formation testing for those teams isn't possible until players are added
- Only 1 match exists total

---

## 7. Bug Report Template

```
Page / URL:         (exact URL)
Steps to Reproduce:  1. ...
                      2. ...
                      3. ...
Expected Result:
Actual Result:
Screenshot:          (attach if available)
Severity:            Critical / High / Medium / Low
```

---

## 8. Final Output

**1. Portal URLs** — see §3 above (all confirmed real routes; two names mapped honestly to shared pages).

**2. Admin Credentials** — your own existing `darodebass@gmail.com` password; no new credentials were generated or stored by me.

**3. Coach Links** — 3 real, live tokens, see §2 table.

**4. Team Tokens** — `86su7bA4` (Jean Rabel Fc), `3AvgsxtM` (Kriminal Fc), `AZoKPUsZ` (MTK). Never expire.

**5. Testing Checklist** — §5, tailored to your actual current data.

**6. Known Limitations** — §6, complete and unhidden.

**7. Production Readiness Notes** — **not production-ready tonight, by design of this exact testing phase.** Concretely: (1) vMix and Website Sync are unconfigured everywhere — expected, no real endpoints exist yet; (2) two of three teams have no players, so most Broadcast Center features can only be fully exercised against Jean Rabel Fc; (3) the Broadcast Readiness score will read low tonight for accurate reasons, not bugs; (4) profile photo upload is a URL field, not a real upload, by design until a storage bucket is built; (5) nothing has been committed to git all session — `git status` will show a large uncommitted diff until you review and approve it.
