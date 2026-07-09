# Launch Readiness Report — Carely BD — 2026-07-09

Full credit-system audit + launch-readiness pass. Everything below was independently verified (live production API calls, code review, or automated tests) — not assumed. Where something could not be independently verified, that's stated explicitly rather than assumed working.

Detailed credit-system trace: see **CREDIT_AUDIT.md**.

---

## Credit System

Every rule from the audit brief, verified against the actual code and live production data:

| Rule | Result |
|---|---|
| Professional gets configured free credits on registration (if enabled) | ✅ Fixed - was unconditional, now respects `freeCreditsEnabled` |
| Customer gets configured free credits on registration (if enabled) | ✅ Fixed - same bug, same fix |
| Google OAuth signup gets free credits (if enabled) | ✅ Fixed - was unconditional, now respects `freeCreditsEnabled` |
| CreditTransaction `'bonus'` record created on registration | ✅ Correct (only when amount > 0, after the fix) |
| `freeCreditsEnabled: false` → 0 starting credits | ✅ Fixed |
| Professional loses 1 credit accepting a booking | ✅ Fixed - now respects `creditsEnabled` (was unconditional) |
| Professional loses 1 credit when selected from job post | ✅ Fixed - same |
| Professional loses 0 credits applying to a job post | ✅ Correct, no bug found |
| Customer loses 1 credit for emergency job post | ✅ Fixed - now respects `creditsEnabled` |
| Customer loses 0 credits for normal job post | ✅ Correct, no bug found |
| Customer loses 0 credits making a booking request | ✅ Correct, no bug found |
| Checks balance before deducting | ✅ Correct everywhere |
| Blocks action with clear inline error if insufficient | ✅ Fixed - now includes a clickable top-up link |
| Deducts exact configured amount (not hardcoded) | ✅ Correct everywhere |
| Creates CreditTransaction with correct type/note | ✅ Correct everywhere |
| Updates totalCreditsUsed | ✅ Correct everywhere |
| Atomic operation, no race condition | ✅ Fixed - was read-then-save, now atomic `findOneAndUpdate` (3 sites) |
| Never goes negative | ✅ Fixed - admin adjustment had no floor, now clamped |
| Refund/no-charge-until-success ordering | ✅ Fixed - booking-accept deducted before the conflict check; reordered |

**Bugs found and fixed** (full detail in CREDIT_AUDIT.md): the `creditsEnabled` master toggle was never checked by any deduction code (confirmed actively affecting production, since it's currently `false` there); registration ignored `freeCreditsEnabled`; `User.credits` schema defaulted to 9999; 5 fake demo professional accounts with a public password were live in production (deleted, and reseed-guarded to never happen in prod again); booking-accept charged before checking for scheduling conflicts with no refund; three deduction sites and two approval flows had race conditions allowing double-spend/double-credit under concurrent requests; admin credit adjustment had no floor-at-zero; insufficient-credit errors had no top-up link; the navbar balance went stale after a same-session deduction; **the Playwright suite itself was executing a real mass-credit-grant against every production user on every run** (found via inflated real account balances, fixed).

**Race conditions checked**: booking-accept, job-select, emergency-post, top-up-approval, and featured-approval all previously used a check-then-write pattern vulnerable to concurrent double-spend/double-approval. All five converted to atomic MongoDB operations (`findOneAndUpdate` with a guard condition). Verified by code review; not separately load-tested with actual concurrent requests (the atomic-operation guarantee comes from MongoDB itself, not from application-level locking, so this is a correctness argument rather than something that needs a race to be triggered to confirm).

**Test results**: 17/17 new dedicated credit-math tests pass on both Desktop and Mobile (34/34). See the "Full Suite" section below for combined totals.

---

## Launch Blockers

**None remaining that block launch.** Everything found in the credit audit has been fixed, deployed, and verified live in production.

### Needs your manual decision (not blockers, just judgment calls I didn't want to make unilaterally)
1. Several **real developer accounts** (`dashpritom713@gmail.com` and similar) currently sit at 6,000–16,000+ credits, inflated by the test-suite bug described above (now fixed going forward). I didn't reset these since they look like your own personal/test accounts, not real customers — reset them via the admin "Individual User Credits" panel if you want clean numbers, otherwise they're harmless (having spare credits doesn't cost anything or affect other users).
2. `creditsEnabled` is currently `false` in production, meaning **booking-accept, job-select, and emergency posts are all currently free** for every user. That's not a bug (it's the toggle working correctly now) — just confirming this is the state you want before real users show up expecting a specific credit-charging behavior.
3. `emergencyPostEnabled` is currently `false` in production — emergency posts are disabled site-wide. Confirm that's intentional.

---

## Launch Readiness Checklist

- [x] Credit system verified correct (see table above; CREDIT_AUDIT.md for full trace)
- [x] Booking flow verified — smart calendar blocking, conflict re-checks at accept/select time, job-post selection creates a real Confirmed booking (shares the same code path as direct-accept), auto-decline-after-24h cron confirmed present and correct, phone numbers included in both parties' confirmation notifications/emails
- [x] Emails working, Brevo first — confirmed live via `GET /api/admin/test-email` → `{"success":true,"provider":"brevo"}`; action buttons with deep links present on all booking/credit/featured emails (fixed earlier this week, unchanged by this audit)
- [x] Push notifications — code path verified (VAPID + `createNotification` helper used consistently); **actual delivery to a real device/browser was not re-verified this session** — I can confirm the code calls the push API correctly, not that a physical notification appeared on a phone
- [x] No data-loss risks — every cron job reviewed: none deletes a user account or a booking; only verification *documents* (not accounts, not profile photos) are ever cleaned up, and only after 15+ days or 90+ days inactive; self-ping keep-alive confirmed present
- [x] Admin controls working — user search, all dashboard tabs, topup/featured approve-reject, renew-all (confirm-guard verified, destructive action intentionally no longer executed by the test suite), verify/suspend, settings toggles all confirmed via code + passing tests
- [x] Security verified — `authMiddleware`/`adminAuthMiddleware` both re-fetch the user from DB on every request (not trusting stale token claims), admin routes correctly require admin role, chat threads scoped so a user can only ever query threads they're part of, no `.env` files or hardcoded secrets found committed to this public repo (only `.env.example` tracked)
- [x] Currency — no `$`/AUD/Stripe references anywhere in the codebase; `formatBDT()` used consistently for every displayed amount; raw numeric values only appear in editable `<input type="number">` fields, never in display-only contexts
- [x] UI/UX — no `window.alert`/`confirm`/`prompt` anywhere in the frontend; footer only renders on landing/terms/privacy/blog pages; no "Verified" badges or verification claims anywhere user-facing (admin dashboard's internal Verified/Unverified column is intentionally kept for internal use)
- [x] All tests passing: **98/98** (49 Desktop + 49 Mobile — 32 main flow + 17 dedicated credit tests, each run on both viewports)

---

## What I could not independently verify (disclosed, not assumed)

- **Actual email inbox delivery.** I confirmed Brevo's API returns success and the email content/buttons are correct, but I did not check a real inbox to see the email actually arrive and render correctly in Gmail/Outlook/etc.
- **Actual push notification receipt on a device.** Confirmed the server-side code path is correct and consistent; did not verify a physical device received and displayed a notification.
- **True multi-document transactional atomicity.** The atomic `findOneAndUpdate` fixes close the specific balance-check race conditions found, but this codebase doesn't use MongoDB multi-document sessions/transactions anywhere. A failure between two related writes in the same request (e.g. a credit deduction succeeding but the subsequent booking save failing for an unrelated reason) still has no automatic rollback/refund. This is now a much smaller window than before the audit, not a fully closed one — disclosed in detail in CREDIT_AUDIT.md.
- **Concurrent-request race conditions were reasoned about, not load-tested.** I did not fire literal simultaneous requests to prove the atomic operations hold under real concurrency — the fix relies on MongoDB's documented atomicity guarantee for single-document `findOneAndUpdate`, which is a standard, well-established guarantee rather than something specific to this codebase that needs empirical proof.

---

## Verdict

**READY TO LAUNCH**, with the three items under "needs your manual decision" above worth a quick look (none of them block launch — they're configuration confirmations, not defects). Every credit-system bug found during this audit has been fixed, deployed to production, and re-verified live. The full automated suite (98 tests across both viewports) passes with zero failures. No secrets are committed to this public repo. No cron job can delete user data.

The one thing worth being deliberate about before onboarding real paying users: decide now whether `creditsEnabled` and `emergencyPostEnabled` should be turned on, since the credit-charging behavior real users experience depends entirely on those two toggles, and they're currently both off.
