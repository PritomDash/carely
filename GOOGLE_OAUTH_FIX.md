# Google OAuth Troubleshooting

## How it works
1. `LoginPage.js` / `RegisterPage.js` call `handleGoogleLogin()` (`carely-frontend/src/utils/googleAuth.js`), which opens `${BACKEND}/api/auth/google` in a popup.
2. Backend (`carely-backend/routes/googleAuthRoutes.js`) redirects to Google, then handles `/api/auth/google/callback`.
3. On success the callback page runs `window.opener.postMessage({ token, user }, FRONTEND_URL)` and closes itself.
4. The opener window's `message` listener stores `carelyToken` / `carelyUser` in `localStorage` and navigates to `/home`.

## Required environment variables

**Backend (Render):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BACKEND_URL` — must exactly match the scheme+host Render serves on (e.g. `https://carely-backend-j4dn.onrender.com`), no trailing slash.
- `FRONTEND_URL` — must exactly match the deployed Vercel URL, no trailing slash. Used both for CORS and as the `postMessage` target origin.
- `JWT_SECRET`

**Frontend (Vercel):**
- `REACT_APP_API_BASE_URL` — must point at the Render backend URL.

## Google Cloud Console setup
In the OAuth 2.0 Client used for `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, under **Authorized redirect URIs**, add exactly:

```
<BACKEND_URL>/api/auth/google/callback
```

Any mismatch (http vs https, trailing slash, wrong subdomain) causes a `redirect_uri_mismatch` error from Google before it ever reaches our callback route.

## Symptom → cause table

| Symptom | Likely cause |
|---|---|
| Button click does nothing / popup blocked message | Browser popup blocker — user must allow popups for the site |
| Google shows `redirect_uri_mismatch` | `BACKEND_URL` env var doesn't match the redirect URI registered in Google Cloud Console |
| Popup completes, closes, but app never logs in | `postMessage` target origin (`FRONTEND_URL` on backend) doesn't match the origin of the window that opened the popup — message gets silently dropped by the browser |
| Popup completes, closes, but app never logs in (even with correct origins) | Frontend listener reading wrong keys off `event.data` — fixed 2026-07: listener was checking `carelyToken`/`carelyUser` but backend sends `token`/`user` |
| `503 Google login is not configured yet` | `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` missing on backend |
| Login works locally, fails in production | `FRONTEND_URL`/`BACKEND_URL` on Render still point at `localhost` |

## Manual verification steps
1. Open browser dev tools → Network tab, click "Continue with Google".
2. Confirm the popup requests `<BACKEND_URL>/api/auth/google` and redirects to `accounts.google.com`.
3. After picking an account, confirm it redirects to `<BACKEND_URL>/api/auth/google/callback` and NOT a mismatch error page.
4. Confirm the popup's final HTML is the `postMessage` + `window.close()` script (view source on the closing tab if it doesn't close automatically — usually means the origin check failed).
5. Check `localStorage` for `carelyToken` and `carelyUser` after the popup closes.
