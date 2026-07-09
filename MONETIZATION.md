# Monetization Model — Carely BD

_Last updated 2026-07-09_

## The model, in one paragraph

Carely is free forever for both families and professionals — there is no commission on what a professional earns, and no cost to browse, book, chat, apply to jobs, or accept bookings. Professionals may optionally buy a **Boost** subscription (7 days for ৳150 or 30 days for ৳500, paid separately via bKash/Nagad or a payment gateway, never with credits) to rank first in search results, receive job alerts 15 minutes before everyone else, and show a star badge — explicitly a paid visibility perk, not verification, and not required for anything. Customers keep a small credits balance (10 free at signup, top-uppable in packs of 15 for ৳200 or 40 for ৳500) that is spent on exactly one thing: **Emergency job posts** (3 credits each), which instantly notify every matching professional and pin the post to the top of the job feed with an URGENT badge.

## Exact settings values now in production

Verified live via `GET /api/admin/settings` after applying `scripts/migrateMonetization.js`:

| Field | Value |
|---|---|
| `bookingAcceptCreditCost` | `0` |
| `jobSelectCreditCost` | `0` |
| `emergencyPostCreditCost` | `3` |
| `customerFreeCredits` | `10` |
| `freeCreditsAmount` (professional) | `0` |
| `freeCreditsEnabled` | `true` |
| `boostNotificationDelayMinutes` | `15` |
| `featuredPacks` | `[{tier:'basic', days:7, priceBDT:150, label:'7 Days Boost'}, {tier:'premium', days:30, priceBDT:500, label:'30 Days Boost'}]` |
| `creditPacks` | `[{credits:15, priceBDT:200, label:'15 Credits'}, {credits:40, priceBDT:500, label:'40 Credits', popular:true}]` |

All of the above are editable from the admin Settings tab without a deploy, including adding/removing individual credit or Boost packs.

## Free vs paid, by role

**Professionals — free forever:**
- Join, browse, apply to job posts, accept bookings, get paid: all free, always. `bookingRoutes.js`'s `accept` route and `jobPostRoutes.js`'s `select`/`apply` routes contain **no credit-check code at all** (not just gated-to-zero — the check was removed entirely).
- Optional: Boost subscription (see below).

**Customers — free forever:**
- Browse, book, chat, rate, post normal job posts: all free.
- Credits (10 free at signup) are spent only on Emergency posts (3 credits each). Buy more in packs of 15 (৳200) or 40 (৳500).

## What happens when credits run out (customer)

Nothing breaks. A customer at 0 credits can still fully use the app — browse, book, chat, rate, and post normal (non-emergency) job posts. Only the Emergency toggle is affected:
- `CreateJobPost.js` fetches the customer's balance and the configured `emergencyPostCreditCost`; if balance is below cost, the Emergency checkbox is disabled and an inline amber card appears: *"Emergency posts cost N credits. You have X credits. **Buy Credits** to post an emergency job."* (links to `/my-credits`), with the normal "Post Job" button unaffected.
- If a request somehow reaches the backend without enough credits anyway (e.g. a stale page), the API returns `{ insufficientCredits: true, message: "You need N credits to post an emergency job. You have X.", credits: X, required: N }`, which the frontend renders inline with a **Buy Credits** link — never a `window.alert`.

## What happens when Boost expires (professional)

Nothing breaks either. A cron at 1am daily (`cronJobs.js`) finds every professional whose `featuredUntil` has passed, and per professional (not a bulk update, so each one gets a personal message):
- Sets `isFeatured: false`, `featuredUntil: null`, `featuredTier: 'none'`.
- Sends an in-app notification + email: *"Your Carely Boost has ended. You can still browse and accept all jobs as normal. Renew your Boost to appear first and get job alerts 15 minutes early."* with a **Renew Boost** button to `/boost`.
- They drop back to normal ranking (by `referralScore + rating*10`), the star badge disappears, and they receive job alerts on the standard 15-minute delay instead of instantly. No feature is ever locked.

## How the 15-minute delayed alert works, and how admin tunes it

When a customer creates **any** job post:
- **Wave 1 (immediate):** every professional matching `professionalType` who is currently Boosted (`isFeatured && featuredUntil > now`) is notified right away. Message: *"New [Type] job in [Area] - you're seeing this first."*
- **Wave 2 (delayed):** everyone else matching `professionalType` is notified `boostNotificationDelayMinutes` (default 15, admin-editable) minutes later. Message: *"New [Type] job in [Area]."*
- **Emergency posts bypass the delay entirely** — the customer paid 3 credits specifically for urgency, so both waves fire together, immediately, to every matching professional.

**Why not `setTimeout`:** Render's free tier can sleep and restart at any time, which would silently drop any pending `setTimeout`. Instead, `JobPost.delayedNotifySent` (default `false`) is set to `true` immediately for emergency posts (no wave 2 needed) and left `false` for normal posts. A cron running every 5 minutes finds `JobPost`s where `createdAt < now - boostNotificationDelayMinutes` and `delayedNotifySent === false` and `status === 'Open'` and `isEmergency === false`, sends wave 2 to every non-Boosted matching professional, and flips the flag. This survives any sleep/restart and was **verified live**: a test created a real job post, shrank the delay to 1 minute, and confirmed the non-Boosted professional was actually notified once the real cron cycle (not a simulated one) processed it, in under 6 minutes.

Admin changes the delay from the Settings tab → Credit Settings → "Boost Job Alert Timing" → no deploy required.

## Bugs found and fixed this session (beyond the model change itself)

- **`0 || 500` bug** in the admin "renew all credits" route: `proAmount || settings.freeCreditsAmount || 500` would have silently substituted the old hardcoded `500` whenever the new deliberate `0` default was in effect, since `0` is falsy. Fixed to nullish-coalescing (`??`).
- **Stale, actively-misleading cron:** the old "low credit warning" notification told professionals to "top up to keep accepting bookings" - no longer true under this model. Removed.
- **Stale, actively-false admin toggle label:** "Credits System - Charge professionals credits to accept bookings" no longer described what the toggle does (it now only gates the referral +1-credit bonus). Relabeled to match reality.
- **Stale, legally-relevant copy:** `Terms.js`'s Credit System clause still said professionals purchase credits spent "to accept a booking." Rewritten to accurately describe the customer-only credits / professional-only Boost split.
- **Fragile settings fetch:** `CreateJobPost.js` used `Promise.all([settings, balance])` with one shared `.catch()` - a transient failure of *either* request silently left `emergencyEnabled` at its `false` default even when the setting was genuinely on, incorrectly hiding an available paid feature. Fixed with independent per-request error handling.
- Migration script (`scripts/migrateMonetization.js`) only ever touches the Settings document - no User model import at all, so it's structurally impossible for it to have modified any existing professional's or customer's credit balance. Applied to production and verified field-by-field.

## Test results

- **New monetization suite** (`tests/credit-system.spec.js`, fully rewritten - the old tests asserted the previous model's now-reversed behavior): **19/19 passing on Desktop, 18/18 on Mobile** (one test is API-only/viewport-independent and was run once on Desktop only). Covers every named test from the brief, including a real (not simulated) end-to-end wait for the delayed-notification cron to actually fire and deliver wave 2.
- **Main regression suite** (`tests/carely-full-test.spec.js`): **32/32 passing on Desktop, 32/32 on Mobile (64/64 total)** - zero regressions found from the monetization changes. One pre-existing test (`27 - Admin renew all credits works`) had a timing flake exposed by the Credits tab now rendering more sections; fixed to actively wait instead of a fixed sleep, and re-confirmed passing on both viewports afterward.
- **Grand total: 101 test executions across both suites and both viewports, 0 failures.**
- `npm run build`: compiles with zero errors and zero warnings.
- Final grep sweep: zero `window.alert/confirm/prompt`, zero `$`/AUD/Stripe references, zero remaining hardcoded credit-cost fallbacks, zero remaining "insufficient credits" checks on booking-accept or job-select, zero user-facing "Verified" text outside the admin-internal user list.

## Anything still needing manual action

- None that block this rollout. Everything specified has been implemented, deployed, and verified live in production.
- Worth a quick look: the existing real developer accounts with inflated credit balances (from a prior session's test-suite bug, already fixed) are unaffected by this migration - their balances were never touched and remain whatever they were.
- Consider whether `creditsEnabled` (now only gating the referral +1-credit bonus) is worth keeping at all, or whether the referral bonus should just always be on - it's currently `false` in production, so the referral credit bonus is currently inactive. Not a bug, just a config choice now that its name/purpose has narrowed.
