const { test, expect } = require('@playwright/test');

// Verifies the free founder welcome (in-app card + push, no email) added for
// new professionals. Runs against production like the other suites in this
// repo (see playwright.config.js baseURL) - every account is a fresh
// timestamped @carelytest.com address so it's safe to run repeatedly.
// Actual push delivery can't be verified here (no device to receive it,
// same limitation noted in password-reset.spec.js for email) - this suite
// instead verifies the founder-welcome-notify endpoint creates the correct
// in-app Notification record, which is the same createNotification() call
// that also fires the push. The endpoint itself never calls sendEmail.
const BACKEND_URL = 'https://carely-backend-j4dn.onrender.com';
const PASSWORD = 'FounderTest123!';
const uniqueSuffix = () => `${Date.now()}.${Math.floor(Math.random() * 100000)}`;
const randomPhone = () => '017' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

const registerAndLogin = async (request, page, role) => {
  const n = uniqueSuffix();
  const email = `founder.${role}.${n}@carelytest.com`;
  const data = {
    name: `Founder Test ${role} ${n}`,
    email,
    password: PASSWORD,
    phone: randomPhone(),
    role,
  };
  if (role === 'professional') {
    data.professionalType = 'Nurse';
    data.hourlyRate = 500;
  }
  const res = await request.post(`${BACKEND_URL}/api/auth/register`, { data });
  expect(res.ok()).toBeTruthy();

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/home', { timeout: 20000 });

  return { email };
};

test.describe('Founder welcome card', () => {
  test('professional sees it, can dismiss it, dismissal survives reload, re-open link works', async ({ page, request }) => {
    await registerAndLogin(request, page, 'professional');

    const heading = page.locator('h3', { hasText: 'A note from the founder' });
    await expect(heading).toBeVisible({ timeout: 15000 });
    await expect(page.locator('a', { hasText: 'Message the founder on Facebook' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Complete your profile' })).toBeVisible();

    await page.locator('button[aria-label="Dismiss"]').click();
    await expect(heading).toHaveCount(0);
    const reopenLink = page.locator('button', { hasText: 'About the founder' });
    await expect(reopenLink).toBeVisible();

    // Dismissal is remembered (localStorage) across a reload.
    await page.reload();
    await expect(page.locator('button', { hasText: 'About the founder' })).toBeVisible({ timeout: 15000 });
    await expect(heading).toHaveCount(0);

    await page.locator('button', { hasText: 'About the founder' }).click();
    await expect(heading).toBeVisible();
  });

  test('customer never sees it', async ({ page, request }) => {
    await registerAndLogin(request, page, 'customer');
    await expect(page.locator('h3', { hasText: 'A note from the founder' })).toHaveCount(0);
    await expect(page.locator('button', { hasText: 'About the founder' })).toHaveCount(0);
  });
});

test.describe('founder-welcome-notify endpoint', () => {
  test('professional-only, idempotent, creates the in-app notification (no email call in the route)', async ({ request }) => {
    const n = uniqueSuffix();
    const proRes = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        name: `Founder API Pro ${n}`,
        email: `founder.api.pro.${n}@carelytest.com`,
        password: PASSWORD,
        phone: randomPhone(),
        role: 'professional', professionalType: 'Nurse', hourlyRate: 500,
      },
    });
    const proBody = await proRes.json();
    const proAuth = { Authorization: `Bearer ${proBody.token}` };

    const first = await request.post(`${BACKEND_URL}/api/users/founder-welcome-notify`, { headers: proAuth });
    expect(first.ok()).toBeTruthy();
    expect((await first.json()).sent).toBe(true);

    const second = await request.post(`${BACKEND_URL}/api/users/founder-welcome-notify`, { headers: proAuth });
    expect(second.ok()).toBeTruthy();
    expect((await second.json()).sent).toBe(false);

    const notifRes = await request.get(`${BACKEND_URL}/api/notifications`, { headers: proAuth });
    const notifBody = await notifRes.json();
    const founderNotif = (notifBody.notifications || []).find((x) => x.link === '/home');
    expect(founderNotif).toBeTruthy();
    expect(founderNotif.message).toMatch(/personal note from the founder/i);
  });

  test('customers get 403, not a notification', async ({ request }) => {
    const n = uniqueSuffix();
    const custRes = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        name: `Founder API Customer ${n}`,
        email: `founder.api.cust.${n}@carelytest.com`,
        password: PASSWORD,
        phone: randomPhone(),
        role: 'customer',
      },
    });
    const custBody = await custRes.json();
    const custAuth = { Authorization: `Bearer ${custBody.token}` };

    const attempt = await request.post(`${BACKEND_URL}/api/users/founder-welcome-notify`, { headers: custAuth });
    expect(attempt.status()).toBe(403);
  });
});
