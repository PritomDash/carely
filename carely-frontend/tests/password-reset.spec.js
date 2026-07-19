const { test, expect } = require('@playwright/test');

// Runs against production like the other suites (see playwright.config.js
// baseURL). Actual email delivery and the real token round-trip (request a
// reset, read the raw token out of the delivered email, submit it, confirm
// login works with the new password) can't be verified here - Playwright
// has no inbox access. That part is verified manually.
const BACKEND_URL = 'https://carely-backend-j4dn.onrender.com';

test.describe('Password reset flow', () => {

  test('Forgot password page loads and submits', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('h2', { hasText: 'Forgot Password' })).toBeVisible();

    await page.locator('input[type="email"]').fill(`reset.test.${Date.now()}@carelytest.com`);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.badge-green')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.badge-green')).toContainText(/reset link/i);
  });

  test('Forgot password returns neutral message for unknown email', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/forgot-password`, {
      data: { email: `definitely-unregistered-${Date.now()}@nowhere-carely.example` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Same wording as the known-email case - no user-enumeration signal.
    expect(body.message).toMatch(/if an account exists/i);
  });

  test('Reset password page loads with token params', async ({ page }) => {
    await page.goto('/reset-password?token=abcdef1234567890&email=someone%40example.com');
    await expect(page.locator('h2', { hasText: 'Reset Password' })).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Reset with invalid/expired token shows error', async ({ page }) => {
    await page.goto('/reset-password?token=notarealtoken0000000000&email=someone%40example.com');

    await page.locator('input[type="password"]').first().fill('NewPassword123!');
    await page.locator('input[type="password"]').nth(1).fill('NewPassword123!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.badge-red')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.badge-red')).toContainText(/invalid or has expired/i);
  });

});
