# Credit System Audit — 2026-07-09

Full trace of every code path that touches `User.credits`, verified against the expected rules, with every bug found and the fix applied. All fixes are committed (`964266b`) and confirmed live in production (both Render backend and Vercel/mycarely.app frontend).

## Summary of severity

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | "Credits System" master toggle never checked by any deduction code | 🔴 Critical - actively affecting production right now | ✅ Fixed |
| 2 | Registration granted free credits regardless of "Free Credits Enabled" toggle | 🔴 Critical | ✅ Fixed |
| 3 | 5 fake demo professionals with public credentials live in production DB | 🔴 Critical (security + integrity) | ✅ Fixed + cleaned up |
| 4 | `User.credits` schema defaulted to 9999 | 🟠 High (latent risk) | ✅ Fixed |
| 5 | Booking-accept deducted credit before the conflict check, no refund on conflict | 🟠 High | ✅ Fixed |
| 6 | Race condition: concurrent credit deductions could double-spend the last credit | 🟠 High | ✅ Fixed (3 sites) |
| 7 | Race condition: concurrent top-up/boost approvals could double-credit | 🟠 High | ✅ Fixed (2 sites) |
| 8 | Admin per-user credit adjustment had no floor-at-0 guard | 🟡 Medium | ✅ Fixed |
| 9 | Insufficient-credit errors had no top-up link | 🟡 Medium (UX) | ✅ Fixed |
| 10 | Navbar credit balance went stale after same-session deduction | 🟡 Medium (UX) | ✅ Fixed |
| 11 | Playwright test was inflating real production users' credit balances every run | 🟠 High (test hygiene / data integrity) | ✅ Fixed |

---

## 1. The "Credits System" toggle did nothing (🔴 most severe finding)

`Settings.creditsEnabled` (admin-facing label: **"Credits System — Charge professionals credits to accept bookings"**, schema default `false`) was checked in exactly two places in the whole codebase: the low-credit-warning cron notification, and the referral +1-credit bonus. **It was never checked by the actual deduction code** — `bookingRoutes.js` accept, `jobPostRoutes.js` select, and `jobPostRoutes.js` emergency-post all deducted credits unconditionally.

**Live production impact confirmed**: `GET /api/admin/settings` showed `creditsEnabled: false` in production at the time of this audit. This means **every professional accepting a booking or being selected from a job post was silently losing a credit right now**, despite the admin dashboard toggle appearing to say charging was off.

**Fix**: all three deduction sites now check `settings.creditsEnabled` and skip the entire credit check/deduct block (treating the action as free) when it's off.

## 2. Registration ignored "Free Credits Enabled"

`authRoutes.js` register and `googleAuthRoutes.js` Google signup both granted the starting balance (500 professional / 10 customer) unconditionally — `settings.freeCreditsEnabled` was never read. Per the expected rule ("if freeCreditsEnabled is false, users get 0 credits"), this is wrong.

**Fix**: both paths now compute `startingCredits = settings.freeCreditsEnabled ? (role-based amount) : 0`, and only create the `CreditTransaction` "Welcome bonus" record when the amount is non-zero.

## 3. Fake demo professionals live in production, with 9999 credits

`app.js`'s `seedProfessionals()` ran on every server boot (no environment guard) and inserted 5 hardcoded demo accounts (`pro1@carely.com` … `pro5@carely.com`, password `Test@1234` — both visible in this **public** GitHub repo) whenever fewer than 5 real professionals existed. **This had already happened in production** — confirmed live via the admin users API, all 5 fake accounts were present and appearing in real search results.

Checked for real bookings referencing these 5 accounts first (found zero), then deleted them via the admin delete-user API (which cascades booking/notification/chat cleanup safely). Added `if (process.env.NODE_ENV === 'production') return;` as the first line of `seedProfessionals()` so this can never happen again in production; Render already sets `NODE_ENV=production` (confirmed - the self-ping keep-alive code already depends on this same check).

## 4. `User.credits` schema default was 9999

Almost certainly a leftover "unlimited during testing" value. Every real user-creation path (register, Google OAuth) already set `credits` explicitly, so this had no *current* effect on real registrations - but it meant any future or overlooked `User.create()`/`new User()` call (like the fake-professional seeding above) would silently grant 9999 credits. Changed the schema default to `0` (fail-safe).

## 5. Booking-accept deducted before checking for conflicts, no refund

`bookingRoutes.js accept/:id` deducted the credit **first**, then ran the scheduling-conflict check. If a conflict was found (another booking got confirmed for the same slot while this one was pending), the route returned a 400 error — but the professional had already been charged, with no refund path anywhere in the codebase. This directly violates the expected rule: *"if the main action fails after deduction, credits are refunded (or deduct only after action succeeds)."*

`jobPostRoutes.js`'s job-select route already had this in the **correct** order (deduct only after confirming the schedule is bookable) - the fix brings booking-accept in line with that pattern: conflict check now runs first, deduction is the last step before the booking is actually confirmed.

## 6. Race conditions in every deduction path

All three deduction sites (booking-accept, job-select, emergency-post) used a **read-then-save** pattern:
```js
if (user.credits < cost) return 403;
user.credits -= cost;
await user.save();
```
Two concurrent requests from the same user (e.g. accepting two different bookings at nearly the same instant, or a double-tap) could both pass the balance check before either write lands, both compute the same post-deduction balance, and both succeed off a single remaining credit.

**Fix**: replaced with an atomic MongoDB update in all three places:
```js
const updated = await User.findOneAndUpdate(
  { _id: userId, credits: { $gte: cost } },
  { $inc: { credits: -cost, totalCreditsUsed: cost } },
  { new: true }
);
if (!updated) { /* insufficient credits - guaranteed, no race window */ }
```
The `credits: { $gte: cost }` filter and the update happen as one atomic operation at the database level, so the balance floor can never be bypassed by a race.

## 7. Same race condition, one level up: top-up and boost approval

`approveTopUp()` (credit purchases) and `approveFeaturedRequest()` (profile boost purchases) both had a sequential guard at the call site (`if (request.status === 'Approved') return 400`) which protects against a second *sequential* click, but not two *concurrent* approve calls — a real scenario for payment-gateway webhooks, which commonly fire duplicate callbacks, or an admin double-clicking Approve.

**Fix**: both helpers now do the `Pending → Approved` status flip as one atomic `findOneAndUpdate` **first**, and only proceed to grant credits/boost if that update actually returned a document (i.e., this call is the one that won the race). Every other concurrent caller gets `null` back and does nothing further. All 5 call sites (admin approve ×2, ShurjoPay/SSLCommerz webhooks ×2, admin approve for featured) updated to handle the null case.

## 8. Admin credit adjustment had no floor

`PUT /api/admin/credits/:userId` did `user.credits += Number(credits)` with no validation and no floor - an admin removing more credits than a user had (a negative amount) could push the balance negative, violating "credits never go negative." Also accepted `NaN` silently (e.g. malformed input).

**Fix**: validates the amount is a finite non-zero number, clamps the result at `Math.max(0, ...)`, and now correctly labels the transaction `'deduct'` vs `'bonus'` based on sign.

## 9 & 10. UX gaps: no top-up link, stale navbar balance

- Insufficient-credit responses already carried an `insufficientCredits: true` flag, but the frontend never read it anywhere - `MyBookingsPage.js` (accept) and `CreateJobPost.js` (emergency post) now show a clickable **"Top up credits"** link inline when that flag is set.
- The navbar credit balance (both desktop and the mobile bottom-sheet) only fetched once per mount, so it stayed stale after a same-session deduction until the next full page load. Added a shared `carely-credits-changed` window event (mirroring the existing `carely-auth-changed` pattern already in this codebase) - accept and emergency-post now dispatch it, and both navbar balance displays listen for it.

## 11. The test suite itself was corrupting real production data

Discovered while investigating why several real (non-test) accounts had accumulated absurd credit balances (one professional at 16,499 credits, a customer at 10,129). The Playwright suite runs against **production** (`playwright.config.js` baseURL = `https://mycarely.app`, no staging environment exists), and test 27 ("Admin renew all credits works") clicked all the way through the confirm flow, executing the real mass-grant against **every single real user in the live database** — every time the suite ran.

**Fix**: test 27 now verifies the two-step confirm UI appears and that Cancel backs out of it, without ever clicking "Yes, Renew for Everyone" again. This is a real behavior-verification change, not a weakened assertion — the destructive action itself is no longer safe to exercise against a shared production database from an automated suite that runs repeatedly.

**Not fixed / left as-is**: the real accounts that already accumulated inflated balances (`dashpritom713@gmail.com` at 16,496 credits, `suchonadasprapti@gmail.com` at 10,129, etc.) were left untouched — these look like personal developer accounts, not real customer accounts, and resetting them wasn't something I wanted to do unilaterally. Recommend the user decide whether to reset them manually via the admin "Individual User Credits" panel now that it has a working floor-at-0 guard.

---

## Rules verified correct (no bug found)

- ✅ Professional applying to a job post is genuinely free — no credit code touches that route at all.
- ✅ Normal (non-emergency) job posts never touch credits — only the `if (isEmergency)` branch does.
- ✅ Declining a booking never deducts credits (verified — no credit code in that route).
- ✅ Cancelling a booking never refunds credits. **Defined behavior**: the professional's credit paid for unlocking the customer's contact info/chat at accept time; cancelling afterward doesn't undo that, so no refund. Consistently implemented everywhere (no refund path exists anywhere in the codebase).
- ✅ Emergency-post credit is only deducted **after** `JobPost.create()` succeeds — if post creation throws, the outer catch fires before any credit code runs, so a failed post never costs a credit. Also fixed: if the post is created but the atomic deduction then loses a race, the post is now deleted rather than left behind uncharged (see #6).
- ✅ Duplicate top-up transaction IDs are rejected (`TopUpRequest.findOne({ transactionID })` checked before creating a new request).
- ✅ `creditPacks` use `priceBDT` consistently — no stale `price` field found anywhere in the current schema or any route (the historical `price`/`priceBDT` bug does not currently exist).
- ✅ All admin credit routes (`topup-requests/*`, `credits/*`, `credits/renew-all`, `featured-requests/*`) are behind `adminAuth`.
- ✅ `GET /api/admin/settings` (public) and the `PUT` (admin-only) confirmed live in production with all expected fields present and correctly named (`bookingAcceptCreditCost`, `jobSelectCreditCost`, `emergencyPostCreditCost`, `freeCreditsEnabled`, `freeCreditsAmount`, `customerFreeCredits`, `creditPacks[].priceBDT`).
- ✅ `Settings.findOne()` is null-guarded with `Settings.create({})` everywhere it's read for a deduction decision — no path crashes or silently skips a check if the settings document is somehow missing.
- ✅ No cron job modifies `credits` — the only cron touching the field is a read-only low-balance notification.

## Residual, lower-probability risk (disclosed, not fixed)

None of this codebase uses MongoDB multi-document transactions (no `session`/`ClientSession` usage anywhere). The atomic `findOneAndUpdate` fixes close the *balance-check* race completely, but if a later step in the same request throws **after** a successful atomic deduction (e.g. `booking.save()` fails for an unrelated DB reason immediately after the credit was atomically deducted), the credit is not automatically refunded - the request's outer `catch` just returns a 500. This is a pre-existing architectural gap (true multi-document ACID transactions would require a bigger refactor) and now applies to a much smaller window than before the reordering fix in #5. Flagging honestly rather than claiming full atomicity across the whole request.

## Test results

See `LAUNCH_READINESS.md` for the full Playwright run results, and the new dedicated credit-math tests added in this same effort (Part 2).
