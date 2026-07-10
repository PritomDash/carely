# Carely BD — Launch Verdict

**Date:** 2026-07-10
**Scope:** Final polish pass before launch (10 parts, this session), on top of prior sessions' work.

---

## 1. What changed this session

**Part 1 — PWA install (Android one-tap)**
- Moved `beforeinstallprompt` capture into an inline `<script>` in `public/index.html`'s `<head>` — the earliest point a listener can attach, before the React bundle even downloads. The old capture point (inside the JS bundle) could miss the event entirely on a slow connection.
- Split `manifest.json`'s icon `purpose: "any maskable"` entries into separate `"any"` and `"maskable"` entries per size (192/512) — a combined purpose value can block installability on some Chrome versions.

**Part 2 — Emergency post toggle**
- Root cause was **not** a code bug: `Settings.emergencyPostEnabled` was `false` in production (a stale value from a past test run's restore snapshot). Fixed live via the admin API and changed the schema default to `true` so it can't silently regress again. Backend deduction logic (exact cost from Settings, post created before deduction, atomic race-safe deduction, rollback on race loss) was already correct.

**Part 3 — Booking cancellation releases the slot**
- Verified (no code changes needed): availability/check-availability endpoints only ever treat `status: 'Confirmed'` as calendar-blocking. Cancelled, Declined, Auto-Declined, Completed, and pending (`AwaitingAcceptance`) bookings never block. Proven live with a full cancel→rebook and decline→rebook cycle.

**Part 4 — Redesigned transactional emails**
- Rewrote `emailService.js`'s template to be fully inline-CSS, table-based (Outlook-safe), 600px card, blue gradient header, colored status pill (Confirmed/Pending/Declined/Completed), safety line in body + footer, Terms/Privacy links, and a generated plain-text fallback for every send.
- Fixed a real latent bug: the old `detailRow()` referenced CSS classes that were never defined anywhere — every detail row was rendering completely unstyled.
- Added admin email notifications (previously push+in-app only) for new manual top-up/boost requests, and filled in "days remaining" / balance details on the boost-activated and credits-added emails.

**Part 5 — Boost badge**
- Replaced all "⭐ Boosted" ribbon/pill badges (HomePage cards, ViewProfilePage, a professional's own profile header) with one small gold star (`#F59E0B`) inline after the name. No ribbon, no text badge, no background tint.

**Part 6 — Search ranking**
- Found and fixed a real bug: the sort checked boost status *before* location proximity, so a boosted professional in a different area could outrank a non-boosted one in the customer's own thana. Reordered to exactly one sort on `[locationScore desc, isBoosted desc, qualityScore desc]`.
- Added a real `completedBookingsCount` field (incremented on mark-done) used in the quality score instead of raw review count.
- Added the "12 Nurses near Gulshan" result count and the honest "Boosted profiles appear first in your area. Carely does not verify professionals." note.
- Proven live: same-thana beats a boosted professional in another district; boosted beats non-boosted within an identical thana.

**Part 7 — Notification bell**
- New `NotificationBell` component: desktop gets a ~380px dropdown anchored under the bell; mobile gets a full-width slide-down sheet. Neither navigates away. Newest-20 list, type icons, 2-line-clamp messages, relative time, unread indicator, mark-all-read, "See all notifications" footer, closes on outside-click/Escape/route-change, live socket updates.
- The mobile bottom-nav's separate "Alerts" tab used to navigate straight to `/notifications`; it now dispatches an event that opens the same in-place panel instead.

**Part 8 — Manual payment flow**
- Found and fixed a real security/integrity gap: `topup-manual` trusted client-submitted `credits`/`amountBDT` with no server-side check against `Settings.creditPacks` — a forged request could claim any number of credits for any price. Price is now always derived server-side from the matching pack.
- Found and fixed a crash bug: if the user account was deleted between request and admin approval, `approveTopUp`/`approveFeaturedRequest` would claim the request as `Approved` and then throw trying to set a field on a null user — leaving the request permanently stuck "done" with nothing actually granted. Now checked before the claim; auto-rejects with a clear reason if the account is gone.
- Added: Pending-status guard on both reject routes (can't reject an already-approved/rejected request), a fix for the boost-rejection notification linking to `/my-credits` instead of `/boost`, reject emails (previously in-app/push only), and an explicit "admin cannot approve their own request" check.
- Found and fixed: production's `platformBkash`/`platformNagad` were both empty strings — nobody could complete a manual payment at all. Added a guard (both client- and server-side) that refuses a submission when the platform number isn't configured, with a clear message, instead of silently accepting a transaction ID against "Not set."
- Added copyable reference codes and the exact "send X, then enter the Transaction ID, credits/boost applied once we verify — usually within a few hours" wording to both `/my-credits` and `/boost`.
- Proven live end-to-end: full credit top-up cycle with exact pack amount + CreditTransaction record, forged credits amount rejected, duplicate transaction ID rejected on both paths, double-approval rejected without double-granting, admin blocked from self-approval, rejection recording the admin's reason with no credits granted.

**Part 9 — BD-market polish**
- **A) Currency:** already correct everywhere — `formatBDT()` with comma grouping, zero `$`/AUD/USD anywhere in the codebase.
- **B) Phone validation:** new shared `isValidBDPhone()` (11 digits, `01` + second digit 3–9), wired into registration, profile edit, and both manual-payment sender-number fields — both client-side (friendly inline error) and server-side (real enforcement).
- **C) Offline resilience:** `api.js` timeout dropped 30s→15s; new `OfflineBanner` shows "You are offline" on the browser's online/offline events. Service worker's existing network-first-with-cache-fallback strategy and "never lose form data on failed submit" (already followed consistently across forms) were verified, not changed.
- **D) Safety note:** added to the booking confirmation screen, matching what the redesigned emails already say.
- **E) Bayesian rating:** ranking's quality score now uses `((3.5×3) + rating×reviewCount) / (3+reviewCount)` instead of the raw average, so a brand-new professional isn't buried at the bottom of their tier forever.
- **F) Empty marketplace:** found that the original "widen thana→district→division" design was dead code — `findNearbyProfessionals` already matches on thana OR district OR division in one pass, so a thana search already silently includes district/division-level results, and re-running the same query with fewer params changes nothing. A search can only genuinely return 0 when nobody of that type exists anywhere in the whole division. Replaced with the one widen step that's actually meaningful: drop the location filter and search nationwide. Proven live with "Aged Care" (currently 0 anywhere in Bangladesh in any single division).
- **G) Trust signals:** "X jobs completed" + "Joined Mon YYYY" added to search cards — honest, verifiable, no verification claim.
- **H) Admin mobile usability:** the manual top-up/boost approval screens had *no* mobile-card fallback at all (only a cramped 8-column horizontally-scrolling table) unlike the Users/Bookings tabs, which already had a table-desktop/cards-mobile split. Added that split here too, with large Approve/Reject buttons and copyable transaction IDs.

**Part 10 — Regression + this document**
- Found and fixed a real scalability bug while running the full suite: creating a job post (especially an emergency one) awaited one notification round-trip per matching professional *in series* before responding — already slow enough with this session's accumulated test accounts to exceed a 20s timeout. Parallelized with `Promise.all`.
- Full Playwright suite run twice (Desktop + Mobile), all failures traced to real bugs and fixed, never weakened a test.

---

## 2. Monetization — final state (plain language)

- **Professionals pay nothing, ever**, for accepting bookings or applying to job posts. Confirmed by direct code sweep: zero "credits" references exist in the professional-facing accept/apply/select routes.
- **Customers get 10 free credits on signup** (`customerFreeCredits: 10`, `freeCreditsEnabled: true`).
- **Credits are spent on exactly one thing:** an Emergency job post costs `3` credits (`emergencyPostCreditCost: 3`), deducted only after the post is successfully created, atomically, with rollback if the deduction loses a race. A normal job post always costs 0 credits regardless of balance.
- **Credit top-ups:** two packs — 15 credits for ৳200, 40 credits for ৳500 (`creditPacks`). Bought via manual bKash/Nagad only right now (`paymentGatewayEnabled: false`).
- **Boost is a separate BDT subscription**, not paid in credits: 7 days for ৳150, 30 days for ৳500 (`featuredPacks`). Gives: gold-star badge, top-of-your-area search ranking, and job alerts 15 minutes before non-boosted professionals (`boostNotificationDelayMinutes: 15`).
- **Referral bonus:** +1 credit per successful referral, but only if `creditsEnabled` is turned on — currently `false` in production, so this bonus is dormant (referral score/count still accrue either way).

## 3. Ranking — final state (plain language)

Search results sort on exactly one rule, three keys in order:
1. **Location** — same thana beats same district beats same division beats no match. (Skipped if the search has no location filter at all.)
2. **Boost** — within the same location tier, a boosted professional (`isFeatured && featuredUntil` in the future) ranks above a non-boosted one.
3. **Quality** — within the same location+boost tier, `(Bayesian rating × 10) + completed bookings + referral score`, descending.

Boost buys top-of-your-own-area, never top-of-country. A search with zero results anywhere in the requested division auto-widens to show that service type nationwide rather than a blank screen, with an honest "No X in Y yet, here are X across Bangladesh" message.

## 4. Payments — honest status

- **Manual bKash/Nagad: tested end-to-end and working.** Full cycle (submit → admin notified email+push+in-app → approve → credits/boost granted exactly, atomically, notification sent) proven live in production for both credits and boost, including every guard (duplicate TRX rejected, forged amount rejected, double-approval rejected, self-approval blocked, deleted-user-mid-flight handled, rejection records a reason).
- **⚠️ `Settings.platformBkash` and `platformNagad` are currently empty strings in production.** As of this fix, the app correctly *refuses* a manual payment submission when they're unset (both client- and server-side) rather than silently accepting a transaction ID against nothing — but this means **no real customer or professional can currently complete a manual payment at all.** This was tested by temporarily setting placeholder values, running the full guard test suite, then reverting to empty (leaving a fake number live would let a real customer send real money to it). **This is the single biggest launch blocker and requires action only you can take** — see §6.
- **Payment gateway (ShurjoPay/SSLCommerz): code-ready, not tested, disabled.** `paymentGatewayEnabled: false`. Code compiles and wires the "Pay Online" button to appear/hide correctly with the toggle. Cannot be tested live — no merchant account or trade license. Credential fields are empty placeholders with TODO comments.

## 5. Test results

**65/65 passing on Desktop, 65/65 passing on Mobile** (one test flagged "flaky" on Mobile — a cron-timing test waiting up to 6 minutes for a background job; passed on the built-in retry, not a real bug).

Covers, across `carely-full-test.spec.js`, `credit-system.spec.js`, and `launch-polish.spec.js`: full registration/booking/chat/admin flows, monetization model (0-credit professional never blocked, 0-credit customer can still browse/book/post normal jobs, exact emergency-post deduction, boost purchase + admin approval + expiry + two-wave notifications), booking slot release on cancel/decline, search ranking (both required orderings), notification bell (both viewports), manual payment (full cycle + every guard above), empty-marketplace nationwide widen, mobile no-horizontal-scroll, and console-error-free key pages.

`npm run build` (frontend): compiles cleanly, zero errors or warnings. `node --check` across every backend route/util/model file: clean.

## 6. Launch blockers

1. **Manual payment numbers not configured** (`platformBkash`/`platformNagad` empty). No one can currently send you money. **You must set these** to your real bKash/Nagad merchant numbers via the admin settings panel before launch — I cannot supply real numbers on your behalf.

No other launch blockers found.

## 7. Needs manual action (things I cannot verify or do for you)

- **Set `platformBkash`/`platformNagad`** to your real numbers (blocker above).
- **Real bKash/Nagad money transfer** — the plumbing is proven correct with test transaction IDs, but an actual payment moving real money through your real merchant account has not and cannot be verified by me.
- **Real email inbox delivery** — I can confirm the send API call succeeds and the HTML renders correctly, but whether emails land in a Gmail inbox vs. spam, and how they look on real Gmail web/mobile clients, requires you to check a real inbox.
- **Real Google OAuth completion** — the sign-in button is present and wired, but completing a real Google OAuth flow end-to-end requires a real Google account interaction I can't perform.
- **Payment gateway merchant account** — ShurjoPay/SSLCommerz credentials, a trade license, and a merchant account are all outside what I can obtain; the code path is ready and toggled off until you have them.
- **Domain/DNS/Google Search Console** or any other infrastructure-level setup outside this repo.

## 8. Verdict

**READY, conditional on one action:** set the real `platformBkash`/`platformNagad` numbers.

Every other part of this session's scope — PWA install, monetization logic, booking calendar integrity, email design, boost badge, search ranking, notification UX, manual-payment guards (once the numbers are set), BD-market polish, and full regression — is implemented, tested against production, and passing. The code is not the blocker; a piece of business configuration only you hold is. Once `platformBkash`/`platformNagad` are set to your real numbers, the manual payment flow (the app's only currently-enabled payment path) becomes fully functional and I'd call this launch-ready.

Everything in §7 is real risk that remains genuinely unverified by me — not because of a known problem, but because verifying it requires access (a live inbox, a real Google account, a real bank transfer) that I don't have. Budget time to check those yourself before or shortly after launch.
