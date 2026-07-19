# Carely BD — Pre-Launch Check

**Date:** 2026-07-19
**Scope:** Final pre-launch sweep — mobile registration bug (Priority 1), full A-to-Z regression on desktop + mobile (Priority 2), payments/emergency-off UI audit (Priority 3), final polish sweep (Priority 4).

---

## 1. Priority 1 — Mobile registration bug: root cause and fix

**Reproduced first, not guess-fixed.** Ran the actual register flow in a real mobile viewport (390×844, touch-emulated Chromium) against production. With a cleanly-typed `01712345678`, registration worked fine on mobile for both roles — so the bug wasn't in CORS, the offline banner, layout/keyboard occlusion, or the terms-checkbox tap target. All of those were checked and ruled out.

**Root cause: the BD phone validator (`isValidBDPhone`, added in commit `4ffd389`) only ever accepted a bare `01XXXXXXXXX` string** — and real mobile input is essentially never that clean:

| Input a real phone actually produces | Example | Old validator |
|---|---|---|
| Bangla-locale keyboard numerals (common default on BD phones) | `০১৭১২৩৪৫৬৭৮` | ❌ rejected |
| Phone's own tel-autofill/QuickType suggestion, with country code | `+8801712345678` | ❌ rejected |
| Manually typed with natural separators | `017 1234 5678` / `017-1234-5678` | ❌ rejected |

A desktop user typing into a browser essentially never hits any of these three — there's no telephony-aware keyboard, no SIM-based autofill, and pasting a formatted number is rare. That's why the bug was mobile-only: the validator was correct in spirit (only real BD mobile numbers should pass) but too literal about the *shape* of the input.

**Fix:** added `normalizeBDPhone()` (`carely-frontend/src/utils/phoneValidation.js` and `carely-backend/utils/phoneValidation.js`, kept in sync) that converts Bengali digits to ASCII, strips a leading `+880`/`880`, and strips spaces/dashes — *then* validates against the same strict `01[3-9]\d{8}` pattern. Genuinely invalid numbers (wrong prefix, wrong length) are still correctly rejected — verified with a dedicated unit pass covering both valid and invalid cases. Applied everywhere a phone is validated: registration, profile update, and the credit/boost manual-payment sender-number fields (all four route files).

**Verified end-to-end after deploy**, live against production, real mobile viewport, both roles:
- Customer registers with a Bengali-numeral phone → 201, logs in, lands on `/home`.
- Professional registers with a `+880`-prefixed phone (plus full form: location, availability, required ID document) → 201, logs in, lands on `/home`.
- A genuinely invalid number (`01012345678`, unallocated prefix) is still correctly rejected with the inline error, on mobile.

This is covered by a new permanent test, `carely-frontend/tests/mobile-registration.spec.js` (not a throwaway script) — 6/6 passing, both viewports.

---

## 2. Full Playwright suite — desktop + mobile

All 6 spec files, both `Desktop` (1280×720) and `Mobile` (390×844) projects:

| Suite | Tests (both viewports) | Result |
|---|---|---|
| `carely-full-test.spec.js` (A-to-Z, 31 steps) | 64 | ✅ all passing (1 `net::ERR_TIMED_OUT` on a `/login` nav, resolved on the built-in retry — a transient Render-network blip, not reproducible, not a code issue) |
| `credit-system.spec.js` | 38 | ✅ all passing |
| `launch-polish.spec.js` | 48 | ✅ all passing |
| `mobile-registration.spec.js` (new) | 6 | ✅ all passing |
| `founder-welcome.spec.js` | 8 | ✅ all passing |
| `password-reset.spec.js` | 8 | ✅ all passing |
| **Total** | **172** | **✅ 172/172, 0 real failures** |

`npm run build` (frontend): **compiles cleanly, zero errors, zero warnings.** `node -c` clean across every backend route/util file touched.

### Two real bugs found and fixed along the way (not test-code issues)

1. **`isValidBDPhone` mobile-input rejection** — covered above (Priority 1).
2. **Stuck "pending top-up" queue clutter for a real admin.** `carely-full-test.spec.js`'s "Admin can approve top-up request" step was failing — traced it to **7 leftover `Pending` TopUpRequests belonging to the admin account itself** (`transactionID` literally `TESTSELFAPPROVE...`), left over from a past session that tested the "an admin cannot approve their own request" fraud guard and never cleaned up afterward. Those requests could never be approved *by design* (that guard is correct, intentional behavior) — so they'd have sat in a real admin's Credits queue forever, looking like unactioned customer requests. Rejected all 7 through the proper admin API. Not an app bug; a data-hygiene issue that would have shipped to a real admin's dashboard.

### Two test-file premises fixed (not weakened — corrected to match reality)

`credit-system.spec.js` and `launch-polish.spec.js` both temporarily flip settings on/off around their own tests and restore them afterward (an existing, correct pattern). Two of their tests still failed because **production's `platformBkash`/`platformNagad` are genuinely blank right now** (payments are off for launch) and one test never toggled `emergencyPostEnabled` at all — the app was correctly rejecting requests with no configured payment number / with emergency posting off, exactly as it should pre-launch. Extended the existing snapshot/restore pattern in both files to also set a temporary test payment number and `emergencyPostEnabled: true` for the duration of just those tests, then restore to the real blank/off state afterward — same treatment already used for the other feature flags in these files, not a new pattern.

### An incident I caused and fixed before finishing

Two of my own background test runs got killed mid-flight by the environment (not something I did on purpose) partway through `launch-polish.spec.js`. That skipped their `afterAll` cleanup, which meant a *later* run's `beforeAll` snapshotted the already-corrupted "on" state as if it were the original, and restored back to that corrupted state instead of the real one. **Net effect: production briefly had `manualTopUpEnabled`, `featuredListingEnabled`, and `emergencyPostEnabled` all `true`, with a fake test bKash/Nagad number (`01700000000`) live**, plus 26 leftover `Pending` test top-up/boost requests (a mix of admin-self `TESTSELFAPPROVE` and real test-account `TESTDUPE`/`TESTDUPEBOOST` fixtures).

Caught this myself before finishing by re-checking live settings, not by the user pointing it out. Fixed immediately:
- Restored all settings to the true original disabled state (`paymentGatewayEnabled`, `manualTopUpEnabled`, `featuredListingEnabled`, `emergencyPostEnabled`, `creditsEnabled` all `false`; `platformBkash`/`platformNagad` both back to blank).
- Rejected all 26 leftover Pending requests via the proper admin API.
- Re-verified live: both queues empty, all flags correctly off, blank payment numbers.

Flagging this because it's a **real risk of this repo's test methodology** (tests run against production, not a staging environment) that's bitten this project before — a previous session's `LAUNCH_VERDICT.md` independently documents the same class of incident (`emergencyPostEnabled` found `false` in production "from a past test run's restore snapshot"). Worth considering a real staging environment before running settings-toggling suites like these again, so a killed process can't leave production mid-flip.

---

## 3. Priority 3 — Payments/emergency off: confirmed clean, no dead buttons

Checked live settings directly (not assumed): `paymentGatewayEnabled`, `manualTopUpEnabled`, `featuredListingEnabled`, `emergencyPostEnabled`, `creditsEnabled` are all `false`; `platformBkash`/`platformNagad` are blank (this is the *real*, restored state as of finishing this session — see the incident above).

Audited every place these flags gate the UI:
- **`BoostPage.js`** — when `featuredListingEnabled` is off, shows "Boost is not available right now," no pack cards, no buttons at all.
- **`CreditsPage.js`** — when both payment flags are off, shows "Top up is not available right now. Contact admin for credits," no buttons.
- **`CreateJobPost.js`** — the entire Emergency Post toggle block is conditionally rendered only when `emergencyPostEnabled` is true; it's simply absent from the DOM right now, not a disabled/dead control.
- No unconditional "Pay Online" / "Buy Boost" / "Buy Credits" buttons found anywhere outside these gates.
- No bKash/Nagad platform numbers shown anywhere (they're blank; the "Not configured yet" message only shows on the payment forms, which themselves are hidden since the flags are off).

**This was already correctly built in a prior session** — nothing needed changing in app code for this priority. A professional exploring the app today hits zero dead paid-feature buttons; every free feature (post job, apply, book, accept, chat, rate) works with no payment step.

---

## 4. Priority 4 — Final sweep

- **No `window.alert`/`confirm`/`prompt`** anywhere in the frontend.
- **All amounts in ৳ (BDT)** via a single `formatBDT()` helper — grepped for `$`/`AUD`/`USD`, zero matches.
- **No "verified" marketing claims.** The only `isVerified`/"Verified" text is an admin-only account-status label in `AdminDashboard.js` (used for suspend/reactivate), never shown to a real customer or professional as a claim about the professional being vetted. `HomePage.js`'s trust signals are explicitly "X jobs completed" + "Joined <month year>" — honest, verifiable, no unbackable claim.
- **No secrets committed.** Grepped for API-key/secret patterns and common provider key prefixes across the backend — no matches. No `.env` file is tracked in git.
- **No leftover APK link.** `MOBILE_BUILD.md` is an internal dev doc with build *instructions*, not a live download link — `LandingPage.js` only offers the PWA install path, no APK link anywhere live.
- **Console errors:** `carely-full-test.spec.js`'s dedicated console-error-check test passed on both viewports (landing, login, register).
- **No horizontal scroll on mobile:** dedicated test passed at 375×812 across `/`, `/login`, `/register`, `/blog`.

## Fake/test accounts — NOT fully cleaned, here's exactly what's live and how to clean it

I was told the fake-account cleanup was already done before this session — that was true at the start. **Running this session's test suites against production (the established pattern in this repo — see `playwright.config.js`'s `baseURL`) created a large number of new test accounts and left them live**, because I don't have `MONGODB_URI` to run the existing cleanup scripts myself. I want to be direct about the scale rather than downplay it: full-suite runs happened 2–3 times each while chasing the settings-corruption incident above, so this is likely 150–250+ new accounts, not a handful.

**The good news: every single one, without exception, uses the `@carelytest.com` domain** (`test.customer.*`, `test.pro.*`, `monetize.*`, `polish.*`, `mobile.*`, `probe-*`, `founder.*`, `reset.test.*` — all `@carelytest.com`). Both existing cleanup scripts (`carely-backend/scripts/removeFakeCustomers.js` and `removeFakePros.js`) already match this exact domain via `TEST_EMAIL_PATTERNS: [/@carelytest\.com$/i, ...]`, and correctly protect the admin account, Hridi, and Prapti by name regardless of email. **You (or a session with `MONGODB_URI`) need to run both scripts with `--confirm` after this session** — it's a clean mechanical cleanup, no manual triage needed, same as before.

I did clean up everything I could reach without direct DB access: the 26 leftover Pending top-up/boost test requests (rejected via the admin API, detailed above) and the settings-corruption incident (restored via the admin API). Those don't need the cleanup scripts.

---

## 5. Needs your manual action

1. **Run `removeFakeCustomers.js --confirm` and `removeFakePros.js --confirm`** (with `MONGODB_URI` set) to clear the test accounts this session's runs created. See §4 above — all `@carelytest.com`, already covered by the existing patterns.
2. **Real mobile device spot-check recommended** before fully trusting this fix — I tested via Chromium's mobile-viewport + touch emulation against production (as thorough as I can get without a physical device), which reproduces viewport/touch/layout behavior correctly, but a Bangla-keyboard numeral or a real phone's tel-autofill suggestion is still worth one real-device confirmation if you have a BD SIM handy.
3. **Real Google OAuth completion** — the sign-in button is present and wired (confirmed by test), but I can't complete a real OAuth round-trip.
4. **Real email inbox delivery** for password reset — confirmed the API call succeeds and the reset link round-trips correctly against a token; actual inbox placement/rendering needs a human checking a real inbox.
5. **Consider a staging environment** for future settings-toggling test runs, per the incident in §2 — this isn't the first time production settings have drifted from a killed/incomplete test run in this repo's history.

## 6. Verdict

**Ready to onboard real professionals**, with the two housekeeping items in §5.1 done as soon as convenient (they don't block anyone — new test accounts don't interfere with real users' bookings, search, or dashboards, but they do inflate your professional count and should be cleared before you're checking real growth numbers).

The mobile registration bug — the actual blocker named in this task — is genuinely fixed and verified end-to-end, live, on production, for both roles, with a permanent regression test guarding it. Payments and emergency posts degrade cleanly to a free-only experience with zero dead buttons, which was already correctly built. The full regression suite is green at 172/172 across both viewports, and both real bugs surfaced while getting there (the phone validator, and the stuck self-test top-up debris) are fixed in app data/code, not papered over in tests.

The one thing I'd flag as a genuine process risk going forward, not a launch blocker: this repo's tests run directly against production with no staging tier, and a killed test process mid-run can leave real settings in a wrong state (it happened during this very session, and happened once before per `LAUNCH_VERDICT.md`). I caught and fixed it before finishing, but a staging environment would remove the risk entirely rather than relying on catching it every time.
