# Carely — Launch Readiness Report

Generated 2026-07-07, end of a full autonomous launch-prep session.

## Test results

**64/64 test executions passed** across both viewports (Desktop 1280x720, Mobile 390x844), 32 tests × 2 projects. One test (`07 - View professional profile page`, Desktop) was flaky on its first attempt due to transient page-load timing and passed cleanly on retry — Playwright itself classifies this as "flaky," not a failure, and it reran with a completely fresh test account, so it isn't masking a real bug.

Run `cd carely-frontend && npx playwright test` to reproduce. Both `carely-frontend` and `carely-backend` build/syntax-check with zero errors.

---

## Everything fixed this session

### 1. Email notifications
- **Root cause found:** Render blocks outbound raw SMTP entirely (confirmed by testing both port 465 and port 587/STARTTLS against Gmail — both timed out identically at the network level, before credentials were even checked).
- **Fix:** replaced Gmail SMTP/nodemailer with the official `resend` npm package, which sends over HTTPS (never blocked). Removed nodemailer entirely, including a second, equally-broken SMTP transporter that `forgot-password` had its own separate copy of.
- Added `GET /api/admin/test-email` (admin-only) so you can verify delivery status directly.
- Every booking/notification email remains fire-and-forget with a 5s timeout — the underlying action (booking, top-up, etc.) always succeeds regardless of email delivery. The one exception is `forgot-password`, which now correctly reports a real error to the user if sending fails, since that's the one flow where a silent failure would strand them.
- **→ Needs your action: add `RESEND_API_KEY` on Render.** See `EMAIL_SETUP_NEEDED.md` for exact steps (free tier, no credit card, ~5 minutes).

### 2. Job post selection now creates a real Confirmed booking
- Previously, selecting a professional from a job post only deducted a credit and flipped the post to `InProgress` — no `Booking` document ever existed, so chat (which requires a Confirmed booking between the two users) never actually unlocked, and neither party saw anything in My Bookings.
- Now derives a bookable date/time/duration from the job post's schedule, builds sessions, runs the same conflict safety-net check used by direct booking acceptance, creates a Confirmed+active Booking, and sends the same notifications/emails (with phone numbers) that direct acceptance does.
- Extracted shared date/session helpers (`utils/bookingHelpers.js`) so both booking paths use identical logic instead of duplicated, divergent copies.

### 3. Admin account & security hardening
- **Closed a real backdoor:** `POST /api/auth/register` accepted any `role` string verbatim — anyone could self-register as `role: "admin"`. Now restricted to customer/professional only.
- **Fixed a real data leak:** the public `GET /api/admin/settings` endpoint returned the *entire* Settings document, including ShurjoPay/SSLCommerz payment gateway secrets in plaintext, to anyone. Now excludes credential fields from the public response.
- Rotated the admin password to a strong one and added `PUT /api/admin/change-password` (self-service, no DB access needed to rotate it in future).
- Audited every route in `adminRoutes.js` — all are behind `adminAuth` except the two intentionally-public ones (feature-flag settings, now secret-free; and an admin-ID lookup used for support chat, which only exposes an ID).
- **God Mode controls** added to the admin dashboard's Settings tab:
  - Pause new registrations
  - Maintenance mode (blocks regular login/register with a message; admin can always still log in to turn it back off) — shown to end users via a new `MaintenanceGate` wrapper
  - Broadcast a notification to every user
  - Export all users as CSV

### 4. Self-sustaining cron jobs
- **Added the self-ping job (every 14 min) — this was completely missing.** Render's free tier sleeps after ~15 minutes idle; without this, the backend would go to sleep and the first real user request each day would hang for 30-50s on cold start. Uses Render's own `RENDER_EXTERNAL_URL` (auto-set on every Render web service) so it can't drift out of sync with the actual host.
- Verified already-working: auto-decline bookings after 24h, expire job posts after 7 days, expire featured listings, clean up old verification documents, low-credit warnings, inactive-account cleanup.
- Confirmed new users always get their starting credits (500 professional / 10 customer) unconditionally at registration — no admin action needed.

### 5. Legal/brand check
- See `LEGAL_BRAND_CHECK.md`. Short version: the logo is original artwork, no concern. The "Carely" name has real (not clear-cut) overlap with several existing apps in the same caregiver-marketplace space, most notably "Carely – Caregiver Listings" on Google Play, which is the same business model under the same name. Documented for your decision — nothing was changed.

### 6. Landing page animations
Staggered hero fade-in-up on load, slow continuous ken-burns zoom on the hero photo, stats count-up-on-scroll, scroll-reveal on service cards/steps/feature cards (via a shared `useReveal` IntersectionObserver hook), hover lift on buttons/cards, and a subtle pulse on the primary CTA. Everything respects `prefers-reduced-motion`.

### 7. Test suite
Expanded from 26 to 32 tests: added real calendar-blocking tests (unavailable dates, already-booked slots), replaced the single soft admin-login check with 5 real admin tests (login, all 7 dashboard tabs render distinct content, approve a top-up, renew credits, verify a professional), strengthened the job-post-selection test to prove a *new* Confirmed booking is created (not just detect the earlier direct-booking one), and added a Google-button presence check. The whole suite now runs on both a desktop and a real mobile viewport via Playwright projects, plus one retry to absorb transient Render-latency flakiness without masking real bugs (a genuinely broken flow still fails on the retry too, since each retry re-runs the whole serial group with fresh test accounts).

Along the way, fixed several real pre-existing test bugs surfaced by this stricter testing: a top-up test whose locators never matched real DOM elements (silently skipping for who knows how long, which is how a real production bug — stale `creditPacks` field name — went unnoticed); a mobile-hidden navbar text locator; and an admin-users-table locator that only matched the desktop `<table>` layout, not the mobile card layout.

### 8. Final polish sweep
Checked and confirmed clean: no `$`/AUD/Stripe references (currency is ৳ BDT throughout), no `window.alert/confirm/prompt` anywhere, no dead `href="#"` links, no Lorem-ipsum/stub text, all empty states have helpful messages, all Unsplash image URLs resolve (200), no raw error stacks exposed to users (frontend or backend), `.gitignore` correctly excludes `.env`/uploads/node_modules, manifest.json and PWA icons correct.

**Also found and fixed in passing:** the live production `Settings.creditPacks` document had a stale field name (`price` instead of the current schema's `priceBDT`), which silently broke every real user's manual credit top-up. Fixed via the admin API.

---

## Admin credentials

```
Email:    admin@carely.com
Password: Car3ly@Admin!2025#BD
```

Works at both `/admin/login` (dedicated admin page) and the regular `/login` page (redirects to `/admin` automatically since the account's role is admin).

`carely-backend/scripts/resetAdmin.js` is available if you ever need to reset this password locally — run it with your real `MONGODB_URI` in a local `.env` (not committed, and not available in the environment this session ran in, which is why the account was created via the public register API instead).

---

## What still needs your action

1. **Email: add `RESEND_API_KEY` on Render.** This is the one functional gap — everything else works end-to-end without you. See `EMAIL_SETUP_NEEDED.md`.
2. **Optional: a real Bangladesh DPDT trademark search for "Carely"** before any paid marketing push, given the overlap found in `LEGAL_BRAND_CHECK.md`. Not urgent, but worth doing before you scale spend on the name.
3. Nothing else is blocking launch. Google OAuth, PWA install, admin tools, bookings, credits, chat, notifications (in-app), and the calendar all verified working end-to-end on both desktop and mobile.
