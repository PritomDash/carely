const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Regression coverage for the pre-launch "registration fails on mobile" bug
// (2026-07-19). Root cause: isValidBDPhone() only accepted a bare
// "01XXXXXXXXX" string. Real mobile input never looks like that - a Bangla
// keyboard/locale (common default on BD phones) produces Bengali numerals
// for the numeric row, and a phone's own tel-autofill/QuickType suggestion
// inserts the number with a "+880" country code. Desktop users typing
// manually essentially never hit either case, which is why this only
// showed up on mobile. Fixed in carely-frontend/src/utils/phoneValidation.js
// and carely-backend/utils/phoneValidation.js (normalizeBDPhone). This
// suite runs these two real-world mobile formats through the actual
// register form on a real mobile viewport, both roles, end to end to /home.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const tinyPngPath = path.join(__dirname, '_mobile-reg-tiny.png');
const tinyPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test.beforeAll(() => { fs.writeFileSync(tinyPngPath, tinyPngBuffer); });
test.afterAll(() => { try { fs.unlinkSync(tinyPngPath); } catch (e) {} });

test.describe('Mobile registration - real-world phone input formats', () => {
  test('Customer registers on mobile with a Bengali-numeral phone number', async ({ page }) => {
    const n = Date.now();
    await page.goto('/register');
    await page.locator('input[type="text"]').first().fill(`Mobile Bengali Customer ${n}`);
    await page.locator('input[type="email"]').fill(`mobile.bn.cust.${n}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    // Bengali-numeral equivalent of 01712345678, as a Bangla-locale keyboard
    // would actually produce it - not something a desktop user ever types.
    await page.locator('input[type="tel"]').fill('০১৭১২৩৪৫৬৭৮');
    await page.locator('#terms').click();
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.locator('text=/Account created successfully/i')).toBeVisible({ timeout: 5000 });

    // End to end: log back in with the same account and land on /home.
    await page.locator('input[type="email"]').fill(`mobile.bn.cust.${n}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('Professional registers on mobile with a +880-prefixed phone number', async ({ page }) => {
    const n = Date.now();
    await page.goto('/register');
    await page.locator('text="I\'m a Professional"').click();

    await page.locator('input[type="text"]').first().fill(`Mobile 880 Pro ${n}`);
    await page.locator('input[type="email"]').fill(`mobile.880.pro.${n}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    // +880 country-code prefix, as a phone's own tel-autofill/QuickType
    // suggestion commonly inserts it - again, not a desktop-typing pattern.
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

  test('Registering with a genuinely invalid number is still rejected, on mobile', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[type="text"]').first().fill('Should Not Register');
    await page.locator('input[type="email"]').fill(`mobile.invalid.${Date.now()}@carelytest.com`);
    await page.locator('input[type="password"]').fill('MobileReg123!');
    await page.locator('input[type="tel"]').fill('01012345678'); // 010 is not an allocated BD prefix
    await page.locator('#terms').click();
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=/valid Bangladeshi mobile number/i')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/register/);
  });
});
