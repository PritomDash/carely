# Email Keys Needed — 3-Provider Fallback

## Why three providers

Render blocks outbound raw SMTP entirely (confirmed earlier via `GET /api/admin/test-email` — Gmail SMTP timed out on both port 465 and 587, at the network level, before credentials were even checked). All three providers below send over HTTPS instead, which is never blocked.

`carely-backend/utils/emailService.js` now tries **Brevo → Resend → SendGrid** in order for every email. Brevo goes first since it uses the verified `carely.help@gmail.com` sender. If one is unconfigured, down, or over its free-tier cap, it automatically falls through to the next — you don't need all three for email to work, but having all three gives you the most free capacity and the most redundancy (~15,000 emails/month combined, and no single point of failure).

You can add just one to start (Brevo is simplest, since the sender is already verified) and add the others later — nothing else needs to change in the code.

## Env vars to add on Render

| Variable | Value |
|---|---|
| `BREVO_API_KEY` | from brevo.com |
| `RESEND_API_KEY` | from resend.com |
| `SENDGRID_API_KEY` | from sendgrid.com |
| `EMAIL_FROM` | `Carely <carely.help@gmail.com>` |
| `EMAIL_REPLY_TO` | `carely.help@gmail.com` |
| `BREVO_FROM_EMAIL` | `carely.help@gmail.com` |

## Step-by-step: getting each key

### 1. Brevo (free: 9,000 emails/month, 300/day)
1. Go to https://www.brevo.com and sign up (no credit card).
2. Dashboard → click your profile icon (top right) → **SMTP & API** → **API Keys** tab.
3. **Generate a new API key**, name it (e.g. "Carely"), copy it.
4. Set as `BREVO_API_KEY` on Render.
5. Verify the `carely.help@gmail.com` sender under **Senders** so `BREVO_FROM_EMAIL` sends succeed (defaults to `carely.help@gmail.com` otherwise).

### 2. Resend (free: 3,000 emails/month, 100/day)
1. Go to https://resend.com and sign up (no credit card).
2. Dashboard → **API Keys** → **Create API Key**. Give it any name (e.g. "Carely production").
3. Copy the key (starts with `re_`) → set as `RESEND_API_KEY` on Render.
4. Optional but recommended: **Domains** → add and verify your own domain, then set `EMAIL_FROM=Carely <noreply@yourdomain.com>`. Without a verified domain, Resend's sandbox sender (`onboarding@resend.dev`) may restrict delivery to only your own account email.

### 3. SendGrid (free: 3,000 emails/month for the first 60 days, then 100/day ongoing)
1. Go to https://sendgrid.com and sign up (no credit card).
2. Settings → **API Keys** → **Create API Key**. Choose "Full Access" (or "Restricted Access" with Mail Send permission only, if you prefer least-privilege).
3. Copy the key (starts with `SG.`) — **SendGrid only shows it once**, so copy it immediately.
4. Set as `SENDGRID_API_KEY` on Render.
5. Required: Settings → **Sender Authentication** → verify a single sender email (or your domain), then set `SENDGRID_FROM_EMAIL` to that address. SendGrid rejects sends from unverified senders.

## How to verify it's working

Log in as admin, then:
```
GET https://carely-backend-j4dn.onrender.com/api/admin/test-email?to=your-email@example.com
Authorization: Bearer <admin JWT>
```
Response shows which provider actually sent it: `{"success":true,"provider":"resend","id":"..."}`. Omit `?to=` to send to the admin's own email instead.

## What happens if none are configured

`sendEmail()` tries all three, they all throw "not configured," and it returns `{success:false, errors:[...]}` without ever blocking the action it's attached to — bookings, top-ups, etc. all succeed regardless of email delivery status.
