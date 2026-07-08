const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000,
  // One retry absorbs transient Render free-tier slowness (cold starts,
  // occasional slow responses under repeated test traffic) without masking
  // real bugs - a genuinely broken flow still fails on retry too.
  retries: 1,
  workers: 1,
  use: {
    // Production has moved to the custom domain; the backend's CORS policy
    // (FRONTEND_URL on Render) only allows this origin, so the old default
    // Vercel URL now fails every API call with a CORS error.
    baseURL: 'https://mycarely.app',
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 20000,
    navigationTimeout: 45000,
  },
  // The full suite runs once per viewport so every flow (registration,
  // booking, calendar, chat, admin tools, etc.) gets exercised on both
  // desktop and a real mobile layout, not just the one dedicated
  // mobile-scroll-check test.
  projects: [
    { name: 'Desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'Mobile',  use: { viewport: { width: 390, height: 844 } } },
  ],
  reporter: [['html', { open: 'never' }], ['list']],
});
