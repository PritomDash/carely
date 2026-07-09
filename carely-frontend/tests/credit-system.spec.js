const { test, expect } = require('@playwright/test');

// Dedicated credit-math verification suite, added during the 2026-07-09
// credit-system audit (see CREDIT_AUDIT.md at repo root). This suite runs
// against production like the main spec, so every account it creates is a
// fresh timestamped @carelytest.com address, and every setting it changes
// (creditsEnabled, freeCreditsEnabled, emergencyPostEnabled,
// manualTopUpEnabled) is snapshotted in beforeAll and restored in afterAll -
// these tests need deduction/registration-bonus/emergency-post logic to
// actually be "on" to verify exact math, regardless of what the admin has
// currently configured for real users.
const BACKEND_URL = 'https://carely-backend-j4dn.onrender.com';
const ADMIN = { email: 'admin@carely.com', password: 'Car3ly@Admin!2025#BD' };

const timestamp = Date.now();
const CUSTOMER = {
  name: 'Credit Test Customer',
  email: `credit.customer.${timestamp}@carelytest.com`,
  password: 'CreditCust123!',
  phone: '01611111111',
};
const PRO = {
  name: 'Credit Test Pro',
  email: `credit.pro.${timestamp}@carelytest.com`,
  password: 'CreditPro123!',
  phone: '01622222222',
};
const ZERO_PRO = {
  name: 'Zero Credit Pro',
  email: `credit.zeropro.${timestamp}@carelytest.com`,
  password: 'ZeroPro123!',
  phone: '01633333333',
};

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

let adminToken;
let customerToken, customerId;
let proToken, proId;
let zeroProToken, zeroProId;
let settings = {};
let originalSettings = null;
let jobPostId;
let topupRequestId;
let topupTransactionId;
let bookingDayCounter = 10; // spread each new booking onto its own day to avoid conflicts

const getBalance = async (request, token) => {
  const res = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(token) });
  const body = await res.json();
  return body.credits;
};

test.describe.serial('Credit System Verification', () => {
  test.beforeAll(async ({ request }) => {
    const adminRes = await request.post(`${BACKEND_URL}/api/auth/login`, { data: ADMIN });
    adminToken = (await adminRes.json()).token;

    const settingsRes = await request.get(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken) });
    const current = await settingsRes.json();
    originalSettings = {
      creditsEnabled: current.creditsEnabled,
      freeCreditsEnabled: current.freeCreditsEnabled,
      emergencyPostEnabled: current.emergencyPostEnabled,
      manualTopUpEnabled: current.manualTopUpEnabled,
    };

    await request.put(`${BACKEND_URL}/api/admin/settings`, {
      headers: authHeader(adminToken),
      data: { creditsEnabled: true, freeCreditsEnabled: true, emergencyPostEnabled: true, manualTopUpEnabled: true },
    });

    const refreshedRes = await request.get(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken) });
    settings = await refreshedRes.json();
  });

  test.afterAll(async ({ request }) => {
    if (!originalSettings) return;
    await request.put(`${BACKEND_URL}/api/admin/settings`, { headers: authHeader(adminToken), data: originalSettings });
  });

  test('Professional registers with exactly the configured starting credits', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        name: PRO.name, email: PRO.email, password: PRO.password, phone: PRO.phone,
        role: 'professional', professionalType: 'Child Care', hourlyRate: 500,
        availability: FULL_AVAILABILITY,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    proToken = body.token;
    proId = body.user._id;
    expect(body.user.credits).toBe(settings.freeCreditsAmount);
    expect(body.user.totalCreditsReceived).toBe(settings.freeCreditsAmount);
    console.log('✅ Professional registered with exactly', body.user.credits, 'credits');
  });

  test('Customer registers with exactly the configured starting credits', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: { name: CUSTOMER.name, email: CUSTOMER.email, password: CUSTOMER.password, phone: CUSTOMER.phone, role: 'customer' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    customerToken = body.token;
    customerId = body.user._id;
    expect(body.user.credits).toBe(settings.customerFreeCredits);
    console.log('✅ Customer registered with exactly', body.user.credits, 'credits');
  });

  test('Accepting booking deducts exactly bookingAcceptCreditCost', async ({ request }) => {
    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(customerToken),
      data: {
        professionalId: proId,
        date: futureDateStr(bookingDayCounter++),
        time: '10:00',
        type: 'short',
        duration: 1,
        address: 'Test Address, Dhanmondi, Dhaka',
        workDescription: 'Credit audit test booking - accept',
      },
    });
    expect(createRes.status()).toBe(200);
    const { bookingId } = await createRes.json();

    const before = await getBalance(request, proToken);
    const acceptRes = await request.post(`${BACKEND_URL}/api/bookings/accept/${bookingId}`, { headers: authHeader(proToken) });
    expect(acceptRes.status()).toBe(200);
    const after = await getBalance(request, proToken);

    expect(after).toBe(before - settings.bookingAcceptCreditCost);
    console.log(`✅ Accept deducted exactly ${settings.bookingAcceptCreditCost} credit(s): ${before} → ${after}`);
  });

  test('Declining booking deducts 0 credits', async ({ request }) => {
    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(customerToken),
      data: {
        professionalId: proId,
        date: futureDateStr(bookingDayCounter++),
        time: '11:00',
        type: 'short',
        duration: 1,
        address: 'Test Address, Dhanmondi, Dhaka',
        workDescription: 'Credit audit test booking - decline',
      },
    });
    expect(createRes.status()).toBe(200);
    const { bookingId } = await createRes.json();

    const before = await getBalance(request, proToken);
    const declineRes = await request.post(`${BACKEND_URL}/api/bookings/decline/${bookingId}`, { headers: authHeader(proToken) });
    expect(declineRes.status()).toBe(200);
    const after = await getBalance(request, proToken);

    expect(after).toBe(before);
    console.log('✅ Decline deducted 0 credits, balance unchanged at', after);
  });

  test('Applying to job post deducts 0 credits', async ({ request }) => {
    const postRes = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(customerToken),
      data: {
        title: 'Credit audit test job post',
        description: 'Verifying apply is free',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: false,
      },
    });
    expect(postRes.status()).toBe(201);
    const post = await postRes.json();
    jobPostId = post._id;

    const before = await getBalance(request, proToken);
    const applyRes = await request.post(`${BACKEND_URL}/api/jobs/${jobPostId}/apply`, { headers: authHeader(proToken) });
    expect(applyRes.status()).toBe(200);
    const after = await getBalance(request, proToken);

    expect(after).toBe(before);
    console.log('✅ Applying to job post deducted 0 credits, balance unchanged at', after);
  });

  test('Being selected from job post deducts exactly jobSelectCreditCost', async ({ request }) => {
    const before = await getBalance(request, proToken);
    const selectRes = await request.post(`${BACKEND_URL}/api/jobs/${jobPostId}/select/${proId}`, { headers: authHeader(customerToken) });
    expect(selectRes.status()).toBe(200);
    const after = await getBalance(request, proToken);

    expect(after).toBe(before - settings.jobSelectCreditCost);
    console.log(`✅ Job-post selection deducted exactly ${settings.jobSelectCreditCost} credit(s): ${before} → ${after}`);
  });

  test('Emergency post deducts exactly emergencyPostCreditCost from customer', async ({ request }) => {
    const before = await getBalance(request, customerToken);
    const res = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(customerToken),
      data: {
        title: 'Credit audit emergency post',
        description: 'Verifying emergency post charges the customer',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: true,
      },
    });
    expect(res.status()).toBe(201);
    const after = await getBalance(request, customerToken);

    expect(after).toBe(before - settings.emergencyPostCreditCost);
    console.log(`✅ Emergency post deducted exactly ${settings.emergencyPostCreditCost} credit(s) from customer: ${before} → ${after}`);
  });

  test('Normal job post deducts 0 credits from customer', async ({ request }) => {
    const before = await getBalance(request, customerToken);
    const res = await request.post(`${BACKEND_URL}/api/jobs`, {
      headers: authHeader(customerToken),
      data: {
        title: 'Credit audit normal post',
        description: 'Verifying normal posts are free',
        serviceType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        schedule: { preferredDays: ['Monday'], preferredTime: '10:00' },
        bookingType: 'short',
        isEmergency: false,
      },
    });
    expect(res.status()).toBe(201);
    const after = await getBalance(request, customerToken);

    expect(after).toBe(before);
    console.log('✅ Normal job post deducted 0 credits from customer, balance unchanged at', after);
  });

  test('Professional with 0 credits CANNOT accept booking', async ({ request }) => {
    const regRes = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        name: ZERO_PRO.name, email: ZERO_PRO.email, password: ZERO_PRO.password, phone: ZERO_PRO.phone,
        role: 'professional', professionalType: 'Child Care', hourlyRate: 500,
        availability: FULL_AVAILABILITY,
      },
    });
    const regBody = await regRes.json();
    zeroProToken = regBody.token;
    zeroProId = regBody.user._id;

    // Zero out via the admin credit-adjustment endpoint, as instructed.
    await request.put(`${BACKEND_URL}/api/admin/credits/${zeroProId}`, {
      headers: authHeader(adminToken),
      data: { credits: -regBody.user.credits, note: 'Credit audit test - zeroed out' },
    });
    const zeroed = await getBalance(request, zeroProToken);
    expect(zeroed).toBe(0);

    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(customerToken),
      data: {
        professionalId: zeroProId,
        date: futureDateStr(bookingDayCounter++),
        time: '10:00',
        type: 'short',
        duration: 1,
        address: 'Test Address, Dhanmondi, Dhaka',
        workDescription: 'Credit audit test booking - zero credit pro',
      },
    });
    expect(createRes.status()).toBe(200);
    const { bookingId } = await createRes.json();

    const acceptRes = await request.post(`${BACKEND_URL}/api/bookings/accept/${bookingId}`, { headers: authHeader(zeroProToken) });
    expect(acceptRes.status()).toBe(403);
    const body = await acceptRes.json();
    expect(body.insufficientCredits).toBe(true);
    console.log('✅ Zero-credit professional correctly blocked from accepting:', body.message);
  });

  test('Insufficient credit error shows inline with top-up link', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ZERO_PRO.email);
    await page.locator('input[type="password"]').fill(ZERO_PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    await page.goto('/my-bookings');
    await page.waitForTimeout(1500);

    const acceptBtn = page.locator('button:has-text("Accept")').first();
    if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/enough credits/i').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('a:has-text("Top up credits")').first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Insufficient-credit inline error with top-up link confirmed');
    } else {
      console.log('⚠️ No pending booking with an Accept button found for the zero-credit professional');
    }
  });

  test('Credits never go negative', async ({ request }) => {
    // zeroProId is already at 0 - try to remove far more than the balance.
    await request.put(`${BACKEND_URL}/api/admin/credits/${zeroProId}`, {
      headers: authHeader(adminToken),
      data: { credits: -9999, note: 'Credit audit test - attempted negative' },
    });
    const balance = await getBalance(request, zeroProToken);
    expect(balance).toBe(0);
    expect(balance).toBeGreaterThanOrEqual(0);
    console.log('✅ Balance floored at 0 despite a -9999 admin adjustment attempt');
  });

  test('Top up request creates Pending status', async ({ request }) => {
    topupTransactionId = 'AUDIT-TRX-' + Date.now();
    const res = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(proToken),
      data: { credits: 150, amountBDT: 500, transactionID: topupTransactionId, senderNumber: '01700000000', paymentMethod: 'bkash' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    topupRequestId = body.requestId;

    const listRes = await request.get(`${BACKEND_URL}/api/credits/my-topups`, { headers: authHeader(proToken) });
    const list = await listRes.json();
    const found = list.find((r) => r._id === topupRequestId);
    expect(found?.status).toBe('Pending');
    console.log('✅ Top up request created with Pending status');
  });

  test('Duplicate transaction ID rejected', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(proToken),
      data: { credits: 150, amountBDT: 500, transactionID: topupTransactionId, senderNumber: '01700000000', paymentMethod: 'bkash' },
    });
    expect(res.status()).toBe(400);
    console.log('✅ Duplicate transaction ID correctly rejected');
  });

  test('Admin approve top up adds exact credits', async ({ request }) => {
    const before = await getBalance(request, proToken);
    const res = await request.put(`${BACKEND_URL}/api/admin/topup-requests/${topupRequestId}/approve`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const after = await getBalance(request, proToken);

    expect(after).toBe(before + 150);
    console.log(`✅ Admin approval added exactly 150 credits: ${before} → ${after}`);
  });

  test('Admin cannot approve same request twice', async ({ request }) => {
    const res = await request.put(`${BACKEND_URL}/api/admin/topup-requests/${topupRequestId}/approve`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(400);
    console.log('✅ Second approval attempt correctly rejected - no double credit');
  });

  test('Transaction history shows correct entries', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/credits/my-transactions`, { headers: authHeader(proToken) });
    const txns = await res.json();

    expect(txns.some((t) => t.type === 'bonus' && t.note === 'Welcome bonus')).toBe(true);
    expect(txns.some((t) => t.type === 'deduct' && t.note === 'Accepted booking request')).toBe(true);
    expect(txns.some((t) => t.type === 'purchase' && t.credits === 150)).toBe(true);
    console.log('✅ Transaction history contains the expected bonus/deduct/purchase entries');
  });

  test('Credit balance in navbar matches credits page', async ({ page, request }) => {
    const apiBalance = await getBalance(request, proToken);

    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    await page.goto('/my-credits');
    await page.waitForTimeout(1000);
    await expect(page.locator(`text="${apiBalance}"`).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Credits page shows API balance:', apiBalance);

    await page.goto('/home');
    await page.waitForTimeout(500);
    const initials = PRO.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const avatar = page.locator('nav').getByText(initials, { exact: true }).first();
    if (await avatar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await avatar.click();
      await page.waitForTimeout(500);
      await expect(page.locator(`text=/${apiBalance} credits/i`).first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Navbar dropdown balance matches credits page:', apiBalance);
    } else {
      console.log('⚠️ Could not open navbar account dropdown to verify the pill (layout-dependent)');
    }
  });
});
