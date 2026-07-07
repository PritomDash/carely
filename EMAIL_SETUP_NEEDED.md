# Email Setup Needed — Resend API Key

## What I found and fixed

Emails were not sending in production. I diagnosed it with a new admin-only endpoint (`GET /api/admin/test-email`) and confirmed: `{"success":false,"error":"Connection timeout"}` — on **both** Gmail's default SMTP (port 465) **and** an explicit port 587/STARTTLS config. A connection timeout happens at the network level, before credentials are even checked, so this wasn't a wrong-password problem — **Render blocks outbound raw SMTP entirely**, which is common on hosting platforms to prevent spam abuse.

**The fix:** `carely-backend/utils/emailService.js` now sends through [Resend](https://resend.com)'s HTTPS API instead of raw SMTP. HTTPS (port 443) is the same protocol your browser uses for everything — it is never blocked by a host the way SMTP sockets are. I installed the official `resend` npm package and removed the Gmail/nodemailer code path entirely (including the separate, equally-broken SMTP transporter that `forgot-password` had its own copy of).

**Nothing else needed a code change.** All existing callers (`fireEmail` for bookings/notifications, `sendEmail` for the password-reset flow) work exactly as before — only the delivery mechanism underneath changed. Every email call still has a timeout and never blocks the action it's attached to (booking creation/acceptance succeeds regardless of whether the email actually sends); the only route that now *does* report a real error to the user if sending fails is `forgot-password`, since that's the one flow where a silently-swallowed failure would strand the user with no way to reset their password.

## What you need to do

1. Sign up free at **https://resend.com** (3,000 emails/month free, no credit card required).
2. Create an API key from the Resend dashboard.
3. In Render → your backend service → **Environment**, add:
   - `RESEND_API_KEY` = the key you just created
4. (Optional, recommended before real users rely on this) **Verify your own domain** in Resend, then set:
   - `RESEND_FROM` = `Carely Bangladesh <noreply@yourdomain.com>`
   Without a verified domain, Resend's default sandbox sender (`onboarding@resend.dev`, which is what the app uses if `RESEND_FROM` is unset) may restrict delivery to only your own Resend account email — fine for testing, not for real customers/professionals.
5. Render redeploys automatically when you save an env var. Once it's back up, verify with:
   ```
   GET https://carely-backend-j4dn.onrender.com/api/admin/test-email
   Authorization: Bearer <admin JWT, from logging in at /api/admin/login>
   ```
   `{"success":true}` means it's working. Check admin@carely.com's inbox for the test email too.

## If RESEND_API_KEY is never set

The app won't crash or block anything — `sendEmail()` logs a clear error (`"RESEND_API_KEY not configured - email not sent. See EMAIL_SETUP_NEEDED.md."`) and returns `{success: false}`, which fire-and-forget callers (bookings, notifications, top-ups) simply ignore. The one exception is `forgot-password`, which will return a real 500 error to the user in this case, since there's no other way for them to get a reset link.
