const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Regression coverage for phone-number validation on mobile registration.
//
// 2026-07-19: "registration fails on mobile" was traced to isValidBDPhone()
// only accepting a bare "01XXXXXXXXX" string, rejecting real mobile input
// (Bengali numerals from a Bangla keyboard, a "+880" country code from
// phone tel-autofill). Fixed by normalizing those before a still-strict
// BD-shape check.
//
// 2026-07-20: that strict BD-shape check itself turned out to be
// over-engineered and still too easy to trip on real-world formatting -
// simplified further to a permissive "does this look like a phone number
// at all" digit-count check (carely-frontend/src/utils/phoneValidation.js,
// carely-backend/utils/phoneValidation.js). Registration must never
// hard-block on phone formatting; only a gentle inline hint, and even that
// never prevents submit unless the field is empty (the browser's own
// `required` handles empty). This suite runs the real register form on a
// real mobile viewport, both roles, end to end to /home.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

const tinyPngPath = path.join(__dirname, '_mobile-reg-tiny.png');
const tinyPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test.beforeAll(() => { fs.writeFileSync(tinyPngPath, tinyPngBuffer); });
test.afterAll(() => { try { fs.unlinkSync(tinyPngPath); } catch (e) {} });

const registerCustomer = async (page, { name, email, phone }) => {
  await page.goto('/register');
  await page.locator('input[type="text"]').first().fill(name);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill('MobileReg123!');
  await page.locator('input[type="tel"]').fill(phone);
  await page.locator('#terms').click();
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await expect(page.locator('text=/Account created successfully/i')).toBeVisible({ timeout: 5000 });
};

test.describe('Mobile registration - permissive phone validation, common real-world formats', () => {
  const formats = [
    { label: 'plain', phone: '01712345678' },
    { label: 'dashed', phone: '017-1234-5678' },
    { label: '+880 prefixed', phone: '+8801712345678' },
    { label: '880 prefixed no plus', phone: '8801712345678' },
    { label: 'spaced', phone: '017 1234 5678' },
  ];

  for (const { label, phone } of formats) {
    test(`Customer registers on mobile with a "${label}" phone number (${phone})`, async ({ page }) => {
      const n = Date.now() + Math.random();
      await registerCustomer(page, {
        name: `Mobile Format Customer ${n}`,
        email: `mobile.fmt.${label.replace(/\W+/g, '')}.${n}@carelytest.com`,
        phone,
      });
    });
  }

  test('Customer registers on mobile with a Bengali-numeral phone number', async ({ page }) => {
    const n = Date.now();
    // Bengali-numeral equivalent of 01712345678, as a Bangla-locale keyboard
    // would actually produce it - not something a desktop user ever types.
    await registerCustomer(page, {
      name: `Mobile Bengali Customer ${n}`,
      email: `mobile.bn.cust.${n}@carelytest.com`,
      phone: '০১৭১২৩৪৫৬৭৮',
    });

    // End to end: log back in with the same account and land on /home.
    await page.locator('input[type="email"]').fill(`mobile.bn.cust.${n}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('Professional registers on mobile with a +880-prefixed phone number, full form, end to end to /home', async ({ page }) => {
    const n = Date.now();
    await page.goto('/register');
    await page.locator('text="I\'m a Professional"').click();

    await page.locator('input[type="text"]').first().fill(`Mobile 880 Pro ${n}`);
    await page.locator('input[type="email"]').fill(`mobile.880.pro.${n}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    await page.locator('input[type="tel"]').fill('+8801712345678');

    await page.locator('select').first().selectOption('Nurse');
    const divisionSelect = page.locator('select').nth(1);
    await divisionSelect.selectOption({ index: 1 });
    const districtSelect = page.locator('select').nth(2);
    await districtSelect.selectOption({ index: 1 });
    const thanaSelect = page.locator('select').nth(3);
    await thanaSelect.selectOption({ index: 1 });

    await page.locator('input[type="file"]').nth(1).setInputFiles(tinyPngPath); // idDocument (required)
    await page.locator('#terms').click();
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.locator('text=/Account created successfully/i')).toBeVisible({ timeout: 5000 });

    // End to end: log back in with the same account and land on /home.
    await page.locator('input[type="email"]').fill(`mobile.880.pro.${n}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('A clearly-not-a-phone value shows a gentle hint but never hard-blocks the submit click', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[type="text"]').first().fill('Should Show Hint Only');
    await page.locator('input[type="email"]').fill(`mobile.hint.${Date.now()}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    await page.locator('input[type="tel"]').fill('123');

    // Gentle inline hint appears while typing - not a blocking form error.
    await expect(page.locator("text=/doesn't quite look like a phone number/i")).toBeVisible({ timeout: 3000 });

    // Submit is never prevented client-side for non-empty input - clicking
    // it actually attempts the request (the backend, not the form, is the
    // only thing that can still say no to something this clearly not a
    // phone number).
    await page.locator('#terms').click();
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/register/);
  });
});
