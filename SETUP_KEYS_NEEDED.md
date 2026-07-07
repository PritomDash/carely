# Setup Keys Needed — All Env Vars for Render

Everything below is needed to fully activate email and push notifications on Render. The app runs and every feature works without these — they only affect whether emails/push notifications actually get delivered.

## Email (pick at least one; all three recommended for redundancy)

| Variable | Value | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | your key | https://resend.com — free 3,000/month, 100/day |
| `BREVO_API_KEY` | your key | https://www.brevo.com — free 9,000/month, 300/day |
| `SENDGRID_API_KEY` | your key | https://sendgrid.com — free 3,000/month (first 60 days), 100/day after |
| `EMAIL_FROM` | `Carely <onboarding@resend.dev>` | (or your own verified domain once set up) |
| `EMAIL_REPLY_TO` | `dashpritom713@gmail.com` | |
| `BREVO_FROM_EMAIL` | a verified Brevo sender address | only needed if using Brevo |
| `SENDGRID_FROM_EMAIL` | a verified SendGrid sender address | only needed if using SendGrid |

Full step-by-step signup instructions for each provider: **EMAIL_KEYS_NEEDED.md**

Order of attempt: Resend → Brevo → SendGrid, automatic fallback if one fails or is unconfigured.

**Confirmed via a live `GET /api/admin/test-email` call: none of the three are currently configured in production** (`{"success":false,"errors":["Resend: Resend not configured","Brevo: Brevo not configured","SendGrid: SendGrid not configured"]}`). Email is fully coded and ready but not sending anything until you add at least one key - Resend is the simplest to start with.

## Web Push (all three required together)

| Variable | Value | Where to get it |
|---|---|---|
| `VAPID_PUBLIC_KEY` | see below | generated this session |
| `VAPID_PRIVATE_KEY` | see below | generated this session |
| `VAPID_EMAIL` | `mailto:dashpritom713@gmail.com` | |

**The actual generated key pair was sent to you directly in this session's chat response, not committed to this file** — this repo is public on GitHub, and committing a private key to a public repo would leak it permanently in git history. See **VAPID_KEYS.md** for the full explanation and how to regenerate a fresh pair yourself if needed.

Confirmed via `GET /api/users/vapid-public-key`: these are **not yet set** in production, so push notifications are currently built and wired up end-to-end but inactive until you add them.

## How to add env vars on Render

Render dashboard → your backend service → **Environment** tab → **Add Environment Variable** → paste each key/value → save. Render redeploys automatically after saving. No code changes needed for any of the above — everything already reads from `process.env`.

## Verifying each one

- **Email:** `GET /api/admin/test-email?to=your-email@example.com` (with an admin JWT) → `{"success":true,"provider":"resend"}` (or brevo/sendgrid, whichever succeeded).
- **Push:** `GET /api/users/vapid-public-key` should return a real key (not `""`). Then log into the app, accept the notification permission prompt, and trigger any booking action to see a real push notification.
