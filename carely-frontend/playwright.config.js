const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'https://carely-tan.vercel.app',
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
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
