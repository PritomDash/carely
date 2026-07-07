# VAPID Keys for Web Push

## ⚠️ Security note

This repo is **public** on GitHub, so the actual VAPID key pair is deliberately **not** written into this file — committing a private key to a public repo leaks it permanently (even if later removed, it stays in git history forever, visible to anyone).

A key pair was generated for you and sent directly in the chat response for this task — copy it from there into Render's environment variables. If you've lost it, regenerate a fresh pair any time (this invalidates old push subscriptions, which is harmless - users just get silently re-subscribed next time they open the app):

```
node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log('VAPID_PUBLIC_KEY='+k.publicKey);console.log('VAPID_PRIVATE_KEY='+k.privateKey);"
```
(run from `carely-backend/`, where the `web-push` package is installed)

## Env vars to add on Render

| Variable | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | (from the generated pair - safe to expose publicly, it's sent to every browser by design) |
| `VAPID_PRIVATE_KEY` | (from the generated pair - **keep secret**, server-side only) |
| `VAPID_EMAIL` | `mailto:dashpritom713@gmail.com` |

## Current status

`GET /api/users/vapid-public-key` currently returns an empty string in production — confirming these env vars are **not yet set** on Render. All the push notification code (backend routes, service worker handlers, frontend subscription flow, and automatic push-on-notification via `notificationService.js`) is already built and wired up; it just needs these three env vars to actually activate. Once added, Render redeploys automatically and push should work immediately - no further code changes needed.

## How to verify it's working

1. Add the three env vars on Render and let it redeploy.
2. `GET /api/users/vapid-public-key` should now return a real key (not empty).
3. Log in to the app in a browser, accept the notification permission prompt (appears ~3 seconds after login), and check the browser's dev tools → Application → Service Workers to confirm a push subscription was created.
4. Trigger any notification-worthy action (e.g. have a professional accept a booking) and confirm a push notification appears, even with the app/tab closed.
