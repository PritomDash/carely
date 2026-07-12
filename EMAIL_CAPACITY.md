# Email Provider Capacity

Checked live against production via `GET /api/admin/email-capacity` (reports
whether each provider's API key env var exists, without sending a real email).

## Current status (verified live, 2026-07-12)

| Provider | Configured in Render? | Free tier limit |
|---|---|---|
| Brevo | ✅ Yes | 300 emails/day |
| Resend | ✅ Yes | 100 emails/day, 3,000/month |
| SendGrid | ❌ **No** | 100 emails/day |

**Fallback order is Brevo → Resend → SendGrid.** Right now that means: if Brevo
fails or hits its daily cap, mail falls through to Resend automatically. If
Resend *also* fails or is exhausted the same day, there is currently nowhere
left to fall through to — SendGrid is wired in code but has no API key, so
`sendViaSendGrid` immediately throws `'SendGrid not configured'` and the send
is recorded as fully failed (logged, never blocking the app, but the email
genuinely does not go out).

## Combined daily capacity

- **Today, as configured:** 300 (Brevo) + up to 100 (Resend) = **400 emails/day**,
  but Resend's monthly cap (3,000) works out to ~100/day *sustained* — a few
  high-volume days are fine, but averaging much above ~100/day via Resend
  every day of the month will exhaust the monthly quota before it resets.
- **If SendGrid is also added:** +100/day = **500 emails/day**, with SendGrid
  as a third independent safety net that isn't tied to Resend's monthly cap.

## Action needed

**Add `SENDGRID_API_KEY` (and `SENDGRID_FROM_EMAIL`, a verified sender) to
Render's environment variables.** This is the only provider currently
missing. Without it, a day where both Brevo *and* Resend are exhausted or
down has no third option and emails will fail outright (not silently — it's
logged clearly now — but they still won't be delivered).

Get a free SendGrid API key at https://signup.sendgrid.com (100 emails/day
free tier, no credit card required for the free plan), verify a sender
identity (single sender verification is enough, doesn't require a whole
domain), then add `SENDGRID_API_KEY` to Render → your service → Environment.
No code change needed - `sendViaSendGrid` in `carely-backend/utils/emailService.js`
already reads it and will start participating in the fallback chain the
moment the key exists.

## How to re-check this yourself later

```
GET /api/admin/email-capacity
Authorization: Bearer <admin token>
```

Returns `{"brevo": true/false, "resend": true/false, "sendgrid": true/false}` -
booleans only, never the actual key values. Re-run this after adding
`SENDGRID_API_KEY` to confirm it picked it up (Render redeploys automatically
on env var changes, and the process needs to restart for `process.env` to
reflect the new value).
