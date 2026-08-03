# GGSP — Sprint 3 Phase 1 Engineering Summary

Final classification of every open item from Sprint 3 Phase 1, as
requested before baseline sign-off. Companion documents:
`SPRINT_3_PHASE_1_VALIDATION_REPORT.md` (live evidence),
`FORCE_PASSWORD_RESET_DESIGN_REVIEW.md` (redesign proposal),
`SPRINT_3_PHASE_1_RELEASE_NOTES.md` (what shipped).

Five classifications used, per your instruction: **Environment
Configuration**, **Confirmed Application Defect**, **Approved
Architectural Redesign**, **Sprint 3 Phase 2**, **Future Maintenance
Sprint**. Items that are simply done and carry no ongoing risk are marked
**Resolved** rather than forced into one of the five.

| Item | Classification | Status / Notes |
|---|---|---|
| Coach invitation unification (Item 1) | Resolved | Confirmed live end-to-end after the Auth URL fix — invite → email → password set → Coach Portal access, invitation correctly reaches `accepted` |
| Archive/`access_status` fix (Item 2) | Resolved | Confirmed live — filter, badge, and action all functional |
| Invitation expiry enforcement (Item 3) | Resolved | Confirmed via regression suite; DB-level behavior matches design |
| Asset Platform foundation (categories, buckets, immutable paths) | Resolved | Confirmed live and via full quality gate; no regressions |
| `qa-staging` permanent account | Resolved | Created, verified active/viewer |
| `docs/ENVIRONMENTS.md` | Resolved | Written, includes reproducible QA account setup steps |
| Supabase Auth URL Configuration (`localhost:3000` redirect) | Environment Configuration | **Resolved.** Site URL and Redirect URLs corrected by the administrator to point at the staging deployment; confirmed via Round 2's correct-domain redirect and the coach invitation flow completing live |
| Coach invitations stuck at `Pending` | Environment Configuration | **Resolved.** Traced to the same Auth URL misconfiguration above, not to a missing team/organization/competition assignment or a role-specific defect — `inviteCoach` already supplies `team_id`/`competition_id` at creation, and `finalizeAcceptedInvitation` has no role-specific gating. See Validation Report Finding 4 |
| `dadoubass@gmail.com` account state | Resolved | Restored via Supabase's native dashboard unban action, confirmed |
| **Force Password Reset sequencing defect (Item 4)** | **Confirmed Application Defect** | **Remains classified as a confirmed application defect — reproduced live in Round 1 — until the redesigned workflow (Design Review Option C) is implemented and validated live. A later, separately-observed Round 2 success does not retract this classification. Not to be represented as reliably working in the interim.** |
| `ban_duration` scope on recovery-token verification (does it reliably block, or is enforcement inconsistent?) | Confirmed Application Defect *(risk, not separately classified)* | Not a standalone item — folded into the Force Password Reset defect above. Recorded as an **implementation risk supported by evidence** (Round 1 vs. Round 2's differing outcomes, plus community-sourced material on `ban_duration` scope), explicitly **not** presented as a confirmed platform defect — not reproduced against official Supabase documentation |
| Resend Invitation defect (pre-existing, all roles) | Future Maintenance Sprint | Root-caused via server logs; small isolated fix identified (`generateLink` instead of a second `inviteUserByEmail` call); not a Phase 1 regression |
| Force Password Reset redesign (Option C: password rotation + refresh-token revocation) | Sprint 3 Phase 2 | Reviewed and recommended; **not yet approved for implementation** — sign-off is a separate, explicit gate before any code changes. Sequenced as Phase 2 lead-in work per the design review |
| Invitation Management module redesign (lifecycle, existing-Auth-user detection, Delete/Restore/Disable/Archive) | Sprint 3 Phase 2 | Scoped in `SPRINT_3_PHASE_2_MASTER_PLAN.md`; planning only, no implementation |
| Coach Portal: Team Roster Management vs. Match Lineup Submission separation | Sprint 3 Phase 2 | Scoped in `SPRINT_3_PHASE_2_MASTER_PLAN.md`; planning only, no implementation |
| Multi-Language Foundation (Kreyòl / English / Français) | Sprint 3 Phase 2 | Scoped in `SPRINT_3_PHASE_2_MASTER_PLAN.md`; planning only, no implementation |
| Temporary staging URL | Future Maintenance Sprint | Already tracked (`STAGING_DEPLOYMENT_PLAYBOOK.md`); depends on fixing the Vercel GitHub auto-deploy integration first |
| Node.js 20.x deprecation | Future Maintenance Sprint | Must land before 2026-10-01; not urgent for Phase 1 closure |
| `deploy.ps1` production tooling debt | Future Maintenance Sprint | Deliberately untouched per longstanding instruction, unrelated to this phase |
| SMTP still on Supabase's built-in sender | Future Maintenance Sprint | Pre-existing, already tracked as a post-staging task |

## Sign-off gate — CLEARED

Both previously-open rows (Supabase Auth URL Configuration,
`dadoubass@gmail.com` account state) are reported and resolved above.

**Sprint 3 Phase 1 is declared the official validated baseline
(2026-08-02).** Implementation remains frozen: no further code changes
land against this phase. Force Password Reset's redesign and every Phase
2 item above require separate, explicit approval before any implementation
begins.
