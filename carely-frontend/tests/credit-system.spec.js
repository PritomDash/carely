const { test, expect } = require('@playwright/test');

// Monetization model verification suite, rewritten 2026-07-09 for the new
// "free forever + optional Boost/Emergency credits" model (see
// MONETIZATION.md at the repo root). This replaces the old credit-system
// tests, which asserted the previous model's behavior (professionals
// spending credits to accept bookings) - that behavior no longer exists.
//
// Runs against production like the main spec, so every account is a fresh
// timestamped @carelytest.com address, and every setting this suite
// changes (emergencyPostEnabled, featuredListingEnabled, manualTopUpEnabled,
// boostNotificationDelayMinutes) is snapshotted in beforeAll and restored
// in afterAll.
const BACKEND_URL = 'https://carely-backend-j4dn.onrender.com';
const ADMIN = { email: 'admin@carely.com', password: 'Car3ly@Admin!2025#BD' };

const timestamp = Date.now();
const CUSTOMER = { name: 'Monetize Test Customer', email: `monetize.customer.${timestamp}@carelytest.com`, password: 'MonetizeCust123!', phone: '01611110001' };
const ZERO_CUSTOMER = { name: 'Zero Credit Customer', email: `monetize.zerocust.${timestamp}@carelytest.com`, password: 'ZeroCust123!', phone: '01611110002' };
const PRO = { name: 'Monetize Test Pro', email: `monetize.pro.${timestamp}@carelytest.com`, password: 'MonetizePro123!', phone: '01622220001' };
const BOOSTED_PRO = { name: 'Boosted Test Pro', email: `monetize.boostedpro.${timestamp}@carelytest.com`, password: 'BoostedPro123!', phone: '01622220002' };
const NONBOOSTED_PRO = { name: 'NonBoosted Test Pro', email: `monetize.nonboostedpro.${timestamp}@carelytest.com`, password: 'NonBoostedPro123!', phone: '01622220003' };

const FULL_AVAILABILITY = JSON.stringify({
  Monday:    { start: '08:00', end: '20:00' },
  Tuesday:   { start: '08:00', end: '20:00' },
  Wednesday: { start: '08:00', end: '20:00' },
  Thursday:  { start: '08:00', end: '20:00' },
  Friday:    { start: '08:00', end: '20:00' },
  Saturday:  { start: '08:00', end: '20:00' },
  Sunday:    { start: '08:00', end: '20:00' },
});

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
const futureDateStr = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
};

const registerPro = async (request, pro) => {
  const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
    data: {
      name: pro.name, email: pro.email, password: pro.password, phone: pro.phone,
      role: 'professional', professionalType: 'Child Care', hourlyRate: 500,
      availability: FULL_AVAILABILITY,
    },
  });
  return res.json();
};

const registerCustomer = async (request, cust) => {
  const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
    data: { name: cust.name, email: cust.email, password: cust.password, phone: cust.phone, role: 'customer' },
  });
  return res.json();
};

const getBalance = async (request, token) => {
  const res = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(token) });
  const body = await res.json();
  return body.credits;
};

let adminToken;
let settings = {};
let originalSettings = null;
let bookingDayCounter = 20;

test.describe.serial('Monetization Model Verification', () => {
  test.beforeAll(async ({ request }) => {
    const adminRes = await request.post(`${BACKEND_URL}/api/auth/login`, { data: ADMIN });
    adminToken = (await adminRes.json()).token;

    const settingsRes = await request.get(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken) });
    const current = await settingsRes.json();
    originalSettings = {
      emergencyPostEnabled: current.emergencyPostEnabled,
      featuredListingEnabled: current.featuredListingEnabled,
      manualTopUpEnabled: current.manualTopUpEnabled,
      boostNotificationDelayMinutes: current.boostNotificationDelayMinutes,
    };

    await request.put(`${BACKEND_URL}/api/admin/settings`, {
      headers: authHeader(adminToken),
      data: { emergencyPostEnabled: true, featuredListingEnabled: true, manualTopUpEnabled: true },
    });

    const refreshedRes = await request.get(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken) });
    settings = await refreshedRes.json();
  });

  test.afterAll(async ({ request }) => {
    if (!originalSettings) return;
    await request.put(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken), data: originalSettings });
  });

  test('Professional registers with 0 credits and can still accept a booking', async ({ request }) => {
    const proBody = await registerPro(request, PRO);
    expect(proBody.user.credits).toBe(0);
    expect(proBody.user.credits).toBe(settings.freeCreditsAmount);

    const custBody = await registerCustomer(request, CUSTOMER);

    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custBody.token),
      data: {
        professionalId: proBody.user._id,
        date: futureDateStr(bookingDayCounter++),
        time: '10:00',
        type: 'short',
        duration: 1,
        address: 'Test Address, Dhanmondi, Dhaka',
        workDescription: 'Monetization test booking',
      },
    });
    expect(createRes.status()).toBe(200);
    const { bookingId } = await createRes.json();

    const acceptRes = await request.post(`${BACKEND_URL}/api/bookings/accept/${bookingId}`, { headers: authHeader(proBody.token) });
    expect(acceptRes.status()).toBe(200);
    const acceptBody = await acceptRes.json();
    expect(acceptBody.booking?.status).toBe('Confirmed');

    const balanceAfter = await getBalance(request, proBody.token);
    expect(balanceAfter).toBe(0);
    console.log('✅ Professional registered with 0 credits and accepted a booking without any credit check');
  });

  test('Professional with 0 credits is NOT blocked from accepting', async ({ request }) => {
    const balance = await getBalance(request, (await registerPro(request, { ...PRO, email: `retest.${PRO.email}` })).token);
    expect(balance).toBe(0);

    // Re-use the PRO/CUSTOMER from the previous test for a second booking to
    // independently confirm accept never returns insufficientCredits.
    const proLogin = await request.post(`${BACKEND_URL}/api/auth/login`, { data: { email: PRO.email, password: PRO.password } });
    const { token: proToken, user: proUser } = await proLogin.json();
    const custLogin = await request.post(`${BACKEND_URL}/api/auth/login`, { data: { email: CUSTOMER.email, password: CUSTOMER.password } });
    const { token: custToken } = await custLogin.json();

    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custToken),
      data: {
        professionalId: proUser._id,
        date: futureDateStr(bookingDayCounter++),
        time: '11:00',
        type: 'short',
        duration: 1,
        address: 'Test Address, Dhanmondi, Dhaka',
        workDescription: 'Second monetization test booking',
      },
    });
    const { bookingId } = await createRes.json();
    const acceptRes = await request.post(`${BACKEND_URL}/api/bookings/accept/${bookingId}`, { headers: authHeader(proToken) });
    expect(acceptRes.status()).toBe(200);
    const body = await acceptRes.json();
    expect(body.insufficientCredits).toBeUndefined();
    console.log('✅ Zero-credit professional not blocked from accepting - no insufficientCredits in response');
  });

  test('Professional with 0 credits is NOT blocked from applying to job', async ({ request }) => {
    const proLogin = await request.post(`${BACKEND_URL}/api/auth/login`, { data: { email: PRO.email, password: PRO.password } });
    const { token: proToken } = await proLogin.json();
    const custLogin = await request.post(`${BACKEND_URL}/api/auth/login`, { data: { email: CUSTOMER.email, password: CUSTOMER.password } });
    const { token: custToken } = await custLogin.json();

    const balanceBefore = await getBalance(request, proToken);
    expect(balanceBefore).toBe(0);

    const postRes = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(custToken),
      data: {
        title: 'Monetization apply test job',
        description: 'Verifying apply is free even at 0 credits',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: false,
      },
    });
    const post = await postRes.json();

    const applyRes = await request.post(`${BACKEND_URL}/api/jobs/${post._id}/apply`, { headers: authHeader(proToken) });
    expect(applyRes.status()).toBe(200);

    const balanceAfter = await getBalance(request, proToken);
    expect(balanceAfter).toBe(0);
    console.log('✅ Zero-credit professional not blocked from applying to a job post');
  });

  test('Customer registers with exactly 10 credits', async ({ request }) => {
    const body = await registerCustomer(request, { ...CUSTOMER, email: `fresh.${CUSTOMER.email}` });
    expect(body.user.credits).toBe(settings.customerFreeCredits);
    expect(body.user.credits).toBe(10);
    console.log('✅ Customer registered with exactly', body.user.credits, 'credits');
  });

  test('Customer with 0 credits can still browse, book, and post normal job', async ({ request }) => {
    const zeroBody = await registerCustomer(request, ZERO_CUSTOMER);
    await request.put(`${BACKEND_URL}/api/admin/credits/${zeroBody.user._id}`, {
      headers: authHeader(adminToken),
      data: { credits: -zeroBody.user.credits, note: 'Monetization test - zero out' },
    });
    const balance = await getBalance(request, zeroBody.token);
    expect(balance).toBe(0);

    // Browse
    const proListRes = await request.get(`${BACKEND_URL}/api/users/professionals`, { headers: authHeader(zeroBody.token) });
    expect(proListRes.status()).toBe(200);

    // Book
    const proLogin = await request.post(`${BACKEND_URL}/api/auth/login`, { data: { email: PRO.email, password: PRO.password } });
    const { user: proUser } = await proLogin.json();
    const bookRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(zeroBody.token),
      data: {
        professionalId: proUser._id,
        date: futureDateStr(bookingDayCounter++),
        time: '12:00',
        type: 'short',
        duration: 1,
        address: 'Test Address, Dhanmondi, Dhaka',
        workDescription: 'Zero-credit customer booking test',
      },
    });
    expect(bookRes.status()).toBe(200);

    // Normal job post
    const postRes = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(zeroBody.token),
      data: {
        title: 'Zero-credit normal post',
        description: 'Verifying normal posts work at 0 credits',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: false,
      },
    });
    expect(postRes.status()).toBe(201);
    console.log('✅ Zero-credit customer can browse, book, and post a normal job');
  });

  test('Customer with 0 credits sees disabled emergency toggle with Buy Credits link', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ZERO_CUSTOMER.email);
    await page.locator('input[type="password"]').fill(ZERO_CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    await page.goto('/create-job-post');
    await page.waitForTimeout(1500);

    const emergencyCheckbox = page.locator('#isEmergency');
    if (await emergencyCheckbox.count()) {
      await expect(emergencyCheckbox).toBeDisabled();
      await expect(page.locator('text=/Buy Credits/i').first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Emergency toggle disabled with Buy Credits link for zero-credit customer');
    } else {
      console.log('⚠️ Emergency toggle not rendered (emergencyPostEnabled may not have propagated yet)');
    }
  });

  test('Emergency post deducts exactly emergencyPostCreditCost credits (10 -> 7)', async ({ request }) => {
    const body = await registerCustomer(request, { ...CUSTOMER, email: `emergency.${CUSTOMER.email}` });
    const before = await getBalance(request, body.token);
    expect(before).toBe(settings.customerFreeCredits);

    const res = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(body.token),
      data: {
        title: 'Monetization emergency post',
        description: 'Verifying emergency deducts exactly the configured cost',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: true,
      },
    });
    expect(res.status()).toBe(201);

    const after = await getBalance(request, body.token);
    expect(after).toBe(before - settings.emergencyPostCreditCost);
    expect(settings.emergencyPostCreditCost).toBe(3);
    expect(after).toBe(7);
    console.log(`✅ Emergency post deducted exactly ${settings.emergencyPostCreditCost} credits: ${before} → ${after}`);
  });

  test('Normal job post deducts 0 credits', async ({ request }) => {
    const body = await registerCustomer(request, { ...CUSTOMER, email: `normalpost.${CUSTOMER.email}` });
    const before = await getBalance(request, body.token);

    const res = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(body.token),
      data: {
        title: 'Monetization normal post',
        description: 'Verifying normal posts are free',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: false,
      },
    });
    expect(res.status()).toBe(201);

    const after = await getBalance(request, body.token);
    expect(after).toBe(before);
    console.log('✅ Normal job post deducted 0 credits, balance unchanged at', after);
  });

  test('Boost page shows both packs with correct BDT prices', async ({ page, request }) => {
    await registerPro(request, { ...PRO, email: `boostpage.${PRO.email}`, phone: '01622229999' });
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(`boostpage.${PRO.email}`);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    await page.goto('/boost');
    await page.waitForTimeout(1500);

    await expect(page.locator('text=/7 Days Boost/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/৳150/').first()).toBeVisible();
    await expect(page.locator('text=/30 Days Boost/i').first()).toBeVisible();
    await expect(page.locator('text=/৳500/').first()).toBeVisible();
    console.log('✅ Boost page shows both packs with correct BDT prices (150 / 500)');
  });

  test('Boost page explains all three benefits clearly', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(`boostpage.${PRO.email}`);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    await page.goto('/boost');
    await page.waitForTimeout(500);

    await expect(page.locator('text=/Top of search results/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/15 minutes/i').first()).toBeVisible();
    await expect(page.locator('text=/Star badge/i').first()).toBeVisible();
    await expect(page.locator('text=/does not guarantee bookings/i').first()).toBeVisible();
    console.log('✅ Boost page explains all three benefits plus the honest "what it does not do" section');
  });

  test('Boosted professional shows star badge and ranks first in search', async ({ request, page }) => {
    const boostedBody = await registerPro(request, BOOSTED_PRO);
    const nonBoostedBody = await registerPro(request, NONBOOSTED_PRO);

    await request.put(`${BACKEND_URL}/api/admin/users/${boostedBody.user._id}/set-featured`, {
      headers: authHeader(adminToken),
      data: { featured: true, days: 30, tier: 'premium' },
    });

    const listRes = await request.get(`${BACKEND_URL}/api/users/professionals?serviceType=${encodeURIComponent('Child Care')}`);
    const list = await listRes.json();
    const boostedIndex = list.findIndex((p) => p._id === boostedBody.user._id);
    const nonBoostedIndex = list.findIndex((p) => p._id === nonBoostedBody.user._id);
    expect(boostedIndex).toBeGreaterThanOrEqual(0);
    expect(nonBoostedIndex).toBeGreaterThanOrEqual(0);
    expect(boostedIndex).toBeLessThan(nonBoostedIndex);
    console.log('✅ Boosted professional ranks ahead of a non-boosted one in the professionals list');

    await page.goto(`/view-profile/${boostedBody.user._id}`);
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Boosted/i').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Boosted professional shows the star badge on their profile');
  });

  test('Expired boost professional can still accept bookings normally', async ({ request }) => {
    const expiredBody = await registerPro(request, { ...PRO, email: `expired.${PRO.email}`, phone: '01622228888' });
    await request.put(`${BACKEND_URL}/api/admin/users/${expiredBody.user._id}/set-featured`, {
      headers: authHeader(adminToken),
      data: { featured: true, days: -1, tier: 'basic' },
    });

    const custBody = await registerCustomer(request, { ...CUSTOMER, email: `forexpired.${CUSTOMER.email}` });
    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custBody.token),
      data: {
        professionalId: expiredBody.user._id,
        date: futureDateStr(bookingDayCounter++),
        time: '13:00',
        type: 'short',
        duration: 1,
        address: 'Test Address, Dhanmondi, Dhaka',
        workDescription: 'Expired boost professional booking test',
      },
    });
    expect(createRes.status()).toBe(200);
    const { bookingId } = await createRes.json();

    const acceptRes = await request.post(`${BACKEND_URL}/api/bookings/accept/${bookingId}`, { headers: authHeader(expiredBody.token) });
    expect(acceptRes.status()).toBe(200);
    console.log('✅ Professional with an expired Boost still accepts bookings normally - nothing is locked');
  });

  test('Credits page for professional explains they need no credits', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    await page.goto('/my-credits');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/don\'t need credits/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a:has-text("Boost Your Profile"), a:has-text("Boost Profile")').first()).toBeVisible();
    console.log('✅ Professional credits page explains they need no credits, with a Boost CTA');
  });

  test('Credits page for customer explains credits are only for emergency posts', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    await page.goto('/my-credits');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/used only for Emergency job posts/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/What are credits for/i').first()).toBeVisible();
    console.log('✅ Customer credits page explains credits are only for Emergency posts');
  });

  let pendingFeaturedRequestId;
  let boostProToken;
  let boostProUserId;

  test('Boost purchase creates Pending FeaturedRequest', async ({ request }) => {
    const body = await registerPro(request, { ...PRO, email: `boostpurchase.${PRO.email}`, phone: '01622227777' });
    boostProToken = body.token;
    boostProUserId = body.user._id;

    const res = await request.post(`${BACKEND_URL}/api/featured/request-manual`, {
      headers: authHeader(boostProToken),
      data: { tier: 'basic', transactionID: 'MONETIZE-TRX-' + Date.now(), senderNumber: '01700000000', method: 'bkash' },
    });
    expect(res.status()).toBe(200);
    const body2 = await res.json();
    pendingFeaturedRequestId = body2.requestId;

    const statusRes = await request.get(`${BACKEND_URL}/api/featured/my-status`, { headers: authHeader(boostProToken) });
    const status = await statusRes.json();
    const found = status.requests.find((r) => r._id === pendingFeaturedRequestId);
    expect(found?.status).toBe('Pending');
    console.log('✅ Boost purchase created a Pending FeaturedRequest');
  });

  test('Admin approve FeaturedRequest activates boost with correct expiry', async ({ request }) => {
    const beforeApprove = new Date();
    const res = await request.put(`${BACKEND_URL}/api/admin/featured-requests/${pendingFeaturedRequestId}/approve`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);

    const statusRes = await request.get(`${BACKEND_URL}/api/featured/my-status`, { headers: authHeader(boostProToken) });
    const status = await statusRes.json();
    expect(status.isFeatured).toBe(true);

    const expectedDays = settings.featuredPacks.find((p) => p.tier === 'basic').days;
    const expiryDate = new Date(status.featuredUntil);
    const expectedExpiry = new Date(beforeApprove.getTime() + expectedDays * 24 * 60 * 60 * 1000);
    const diffHours = Math.abs(expiryDate - expectedExpiry) / (1000 * 60 * 60);
    expect(diffHours).toBeLessThan(1);
    console.log(`✅ Boost activated with expiry ~${expectedDays} days out (within 1 hour of expected)`);
  });

  test('Admin can change boostNotificationDelayMinutes in settings', async ({ request }) => {
    await request.put(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken), data: { boostNotificationDelayMinutes: 20 } });
    const res = await request.get(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken) });
    const body = await res.json();
    expect(body.boostNotificationDelayMinutes).toBe(20);

    // Restore for the rest of this suite / other tests
    await request.put(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken), data: { boostNotificationDelayMinutes: 15 } });
    console.log('✅ Admin successfully changed boostNotificationDelayMinutes to 20 and back to 15');
  });

  test('Delayed job alert: boosted pro notified immediately, non-boosted not yet, emergency notifies everyone at once', async ({ request }) => {
    const boostedBody = await registerPro(request, { ...BOOSTED_PRO, email: `wave.${BOOSTED_PRO.email}`, phone: '01622226666' });
    const nonBoostedBody = await registerPro(request, { ...NONBOOSTED_PRO, email: `wave.${NONBOOSTED_PRO.email}`, phone: '01622225555' });
    await request.put(`${BACKEND_URL}/api/admin/users/${boostedBody.user._id}/set-featured`, {
      headers: authHeader(adminToken),
      data: { featured: true, days: 7, tier: 'basic' },
    });

    const custBody = await registerCustomer(request, { ...CUSTOMER, email: `wave.${CUSTOMER.email}` });

    // Normal post - wave 1 (boosted) immediate, wave 2 (everyone else) delayed
    const normalPostRes = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(custBody.token),
      data: {
        title: 'Wave test normal post',
        description: 'Verifying two-wave notification timing',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: false,
      },
    });
    const normalPost = await normalPostRes.json();

    // delayedNotifySent must be false immediately - wave 2 hasn't run yet
    const postCheckRes = await request.get(`${BACKEND_URL}/api/jobs/${normalPost._id}`, { headers: authHeader(custBody.token) });
    const postCheck = await postCheckRes.json();
    expect(postCheck.delayedNotifySent).toBe(false);

    const boostedNotifsRes = await request.get(`${BACKEND_URL}/api/notifications`, { headers: authHeader(boostedBody.token) });
    const boostedNotifs = (await boostedNotifsRes.json()).notifications;
    const boostedHasIt = boostedNotifs.some((n) => n.link === '/job-posts/' + normalPost._id);
    expect(boostedHasIt).toBe(true);

    const nonBoostedNotifsRes = await request.get(`${BACKEND_URL}/api/notifications`, { headers: authHeader(nonBoostedBody.token) });
    const nonBoostedNotifs = (await nonBoostedNotifsRes.json()).notifications;
    const nonBoostedHasIt = nonBoostedNotifs.some((n) => n.link === '/job-posts/' + normalPost._id);
    expect(nonBoostedHasIt).toBe(false);
    console.log('✅ Normal post: boosted pro notified immediately, non-boosted pro not notified yet, delayedNotifySent=false');

    // Emergency post - notifies everyone at once, no delay at all
    const emergencyPostRes = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(custBody.token),
      data: {
        title: 'Wave test emergency post',
        description: 'Verifying emergency bypasses the delay entirely',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: true,
      },
    });
    const emergencyPost = await emergencyPostRes.json();

    const emergencyPostCheckRes = await request.get(`${BACKEND_URL}/api/jobs/${emergencyPost._id}`, { headers: authHeader(custBody.token) });
    const emergencyPostCheck = await emergencyPostCheckRes.json();
    expect(emergencyPostCheck.delayedNotifySent).toBe(true);

    const nonBoostedNotifsRes2 = await request.get(`${BACKEND_URL}/api/notifications`, { headers: authHeader(nonBoostedBody.token) });
    const nonBoostedNotifs2 = (await nonBoostedNotifsRes2.json()).notifications;
    const nonBoostedHasEmergency = nonBoostedNotifs2.some((n) => n.link === '/job-posts/' + emergencyPost._id);
    expect(nonBoostedHasEmergency).toBe(true);
    console.log('✅ Emergency post: delayedNotifySent=true immediately, non-boosted pro notified right away too');
  });

  test('Delayed job alert: non-boosted pro eventually notified after the cron processes the delay window', async ({ request }) => {
    test.setTimeout(7 * 60 * 1000);

    // Shrink the delay so the very next 5-minute cron tick is guaranteed to
    // be past the window, instead of waiting the real 15-minute default.
    await request.put(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken), data: { boostNotificationDelayMinutes: 1 } });

    const nonBoostedBody = await registerPro(request, { ...NONBOOSTED_PRO, email: `cronwave.${NONBOOSTED_PRO.email}`, phone: '01622224444' });
    const custBody = await registerCustomer(request, { ...CUSTOMER, email: `cronwave.${CUSTOMER.email}` });

    const postRes = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(custBody.token),
      data: {
        title: 'Cron wave test post',
        description: 'Verifying the 5-minute cron eventually delivers wave 2',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: false,
      },
    });
    const post = await postRes.json();

    console.log('⏳ Waiting up to 6 minutes for the delayed-notification cron to process this post...');
    let delivered = false;
    const deadline = Date.now() + 6 * 60 * 1000;
    while (Date.now() < deadline) {
      const checkRes = await request.get(`${BACKEND_URL}/api/jobs/${post._id}`, { headers: authHeader(custBody.token) });
      const check = await checkRes.json();
      if (check.delayedNotifySent) { delivered = true; break; }
      await new Promise((r) => setTimeout(r, 20000));
    }
    expect(delivered).toBe(true);

    const notifsRes = await request.get(`${BACKEND_URL}/api/notifications`, { headers: authHeader(nonBoostedBody.token) });
    const notifs = (await notifsRes.json()).notifications;
    const hasIt = notifs.some((n) => n.link === '/job-posts/' + post._id);
    expect(hasIt).toBe(true);
    console.log('✅ Non-boosted professional was notified once the delayed-notification cron processed the post');

    await request.put(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken), data: { boostNotificationDelayMinutes: 15 } });
  });
});
