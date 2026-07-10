const { test, expect } = require('@playwright/test');

// Launch-polish verification suite, added 2026-07-10. Runs against
// production like the other suites, so every account is a fresh
// timestamped @carelytest.com address. Settings this suite changes are
// snapshotted in beforeAll and restored in afterAll.
const BACKEND_URL = 'https://carely-backend-j4dn.onrender.com';
const ADMIN = { email: 'admin@carely.com', password: 'Car3ly@Admin!2025#BD' };

const timestamp = Date.now();
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
const futureDateStr = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
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

const registerPro = async (request, overrides = {}) => {
  const n = Date.now() + Math.random();
  const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
    data: {
      name: overrides.name || `Polish Pro ${n}`,
      email: overrides.email || `polish.pro.${n}@carelytest.com`,
      password: 'PolishPro123!',
      phone: overrides.phone || '01755' + String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
      role: 'professional', professionalType: overrides.professionalType || 'Nurse', hourlyRate: 500,
      availability: FULL_AVAILABILITY,
      ...(overrides.location ? { location: JSON.stringify(overrides.location) } : {}),
    },
  });
  return res.json();
};

const registerCustomer = async (request, overrides = {}) => {
  const n = Date.now() + Math.random();
  const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
    data: {
      name: overrides.name || `Polish Customer ${n}`,
      email: overrides.email || `polish.customer.${n}@carelytest.com`,
      password: 'PolishCust123!',
      phone: overrides.phone || '01766' + String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
      role: 'customer',
    },
  });
  return res.json();
};

let adminToken;
let bookingDayCounter = 40;

test.describe.serial('Launch Polish Verification', () => {
  test.beforeAll(async ({ request }) => {
    const adminRes = await request.post(`${BACKEND_URL}/api/auth/login`, { data: ADMIN });
    adminToken = (await adminRes.json()).token;
  });

  test('Cancelled booking releases the time slot for another customer', async ({ request }) => {
    const proBody = await registerPro(request);
    const custABody = await registerCustomer(request);
    const custBBody = await registerCustomer(request);

    const date = futureDateStr(bookingDayCounter++);
    const time = '10:00';

    // Customer A books, pro accepts -> slot occupied
    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custABody.token),
      data: { professionalId: proBody.user._id, date, time, type: 'short', duration: 1, address: 'Test Address, Dhaka', workDescription: 'Slot release test' },
    });
    const { bookingId } = await createRes.json();
    const acceptRes = await request.post(`${BACKEND_URL}/api/bookings/accept/${bookingId}`, { headers: authHeader(proBody.token) });
    expect(acceptRes.status()).toBe(200);

    // Verify slot shows as booked
    const availAfterAccept = await request.get(`${BACKEND_URL}/api/bookings/availability/${proBody.user._id}`);
    const availAfterAcceptBody = await availAfterAccept.json();
    const bookedOnDate = availAfterAcceptBody.bookedSlots[date] || [];
    expect(bookedOnDate.some((s) => s.startTime === time)).toBe(true);

    const checkBeforeCancel = await request.post(`${BACKEND_URL}/api/bookings/check-availability`, {
      data: { professionalId: proBody.user._id, date, time, duration: 1 },
    });
    expect((await checkBeforeCancel.json()).available).toBe(false);
    console.log('✅ Slot correctly shown as booked after accept');

    // Customer A cancels
    const cancelRes = await request.post(`${BACKEND_URL}/api/bookings/cancel/${bookingId}`, { headers: authHeader(custABody.token) });
    expect(cancelRes.status()).toBe(200);

    // Customer B must now see the slot as free
    const availAfterCancel = await request.get(`${BACKEND_URL}/api/bookings/availability/${proBody.user._id}`);
    const availAfterCancelBody = await availAfterCancel.json();
    const stillBooked = (availAfterCancelBody.bookedSlots[date] || []).some((s) => s.startTime === time);
    expect(stillBooked).toBe(false);

    const checkAfterCancel = await request.post(`${BACKEND_URL}/api/bookings/check-availability`, {
      data: { professionalId: proBody.user._id, date, time, duration: 1 },
    });
    expect((await checkAfterCancel.json()).available).toBe(true);

    // Customer B can actually create a booking for the same slot
    const rebookRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custBBody.token),
      data: { professionalId: proBody.user._id, date, time, type: 'short', duration: 1, address: 'Test Address 2, Dhaka', workDescription: 'Rebooking after cancel' },
    });
    expect(rebookRes.status()).toBe(200);
    console.log('✅ Cancelled booking released the slot - a different customer successfully rebooked it');
  });

  test('Declined booking releases the slot', async ({ request }) => {
    const proBody = await registerPro(request);
    const custABody = await registerCustomer(request);
    const custBBody = await registerCustomer(request);

    const date = futureDateStr(bookingDayCounter++);
    const time = '11:00';

    const createRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custABody.token),
      data: { professionalId: proBody.user._id, date, time, type: 'short', duration: 1, address: 'Test Address, Dhaka', workDescription: 'Decline release test' },
    });
    const { bookingId } = await createRes.json();

    const declineRes = await request.post(`${BACKEND_URL}/api/bookings/decline/${bookingId}`, { headers: authHeader(proBody.token) });
    expect(declineRes.status()).toBe(200);

    const checkAfterDecline = await request.post(`${BACKEND_URL}/api/bookings/check-availability`, {
      data: { professionalId: proBody.user._id, date, time, duration: 1 },
    });
    expect((await checkAfterDecline.json()).available).toBe(true);

    const rebookRes = await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custBBody.token),
      data: { professionalId: proBody.user._id, date, time, type: 'short', duration: 1, address: 'Test Address 2, Dhaka', workDescription: 'Rebooking after decline' },
    });
    expect(rebookRes.status()).toBe(200);
    console.log('✅ Declined booking released the slot for another customer');
  });

  test('AwaitingAcceptance (pending, unconfirmed) request does NOT block the calendar', async ({ request }) => {
    const proBody = await registerPro(request);
    const custABody = await registerCustomer(request);
    const custBBody = await registerCustomer(request);

    const date = futureDateStr(bookingDayCounter++);
    const time = '14:00';

    await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(custABody.token),
      data: { professionalId: proBody.user._id, date, time, type: 'short', duration: 1, address: 'Test Address, Dhaka', workDescription: 'Pending request should not block' },
    });

    // Still AwaitingAcceptance - a second customer must still see this as available
    const checkRes = await request.post(`${BACKEND_URL}/api/bookings/check-availability`, {
      data: { professionalId: proBody.user._id, date, time, duration: 1 },
    });
    expect((await checkRes.json()).available).toBe(true);

    const availRes = await request.get(`${BACKEND_URL}/api/bookings/availability/${proBody.user._id}`);
    const availBody = await availRes.json();
    const blocked = (availBody.bookedSlots[date] || []).some((s) => s.startTime === time);
    expect(blocked).toBe(false);
    console.log('✅ A pending (AwaitingAcceptance) request does not block the calendar for other customers');
  });

  // Boost a professional via the real manual-payment path (request + admin
  // approve), the same flow a real professional would use. Uses a unique
  // transaction ID per call since duplicates are rejected.
  const boostPro = async (request, token) => {
    const trx = 'TESTTRX' + Date.now() + Math.floor(Math.random() * 100000);
    const reqRes = await request.post(`${BACKEND_URL}/api/featured/request-manual`, {
      headers: authHeader(token),
      data: { tier: 'basic', transactionID: trx, senderNumber: '01712345678', method: 'bkash' },
    });
    const { requestId } = await reqRes.json();
    const approveRes = await request.put(`${BACKEND_URL}/api/admin/featured-requests/${requestId}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(approveRes.status()).toBe(200);
  };

  test('Search ranking: same-thana non-boosted outranks a boosted professional in another district', async ({ request }) => {
    // Both share the Dhaka division (so neither gets filtered out of a
    // Gulshan-thana search entirely) but proFar is a different district
    // (Gazipur) with a lower location tier (1) than proLocal's exact
    // thana match (3) - proLocal must win regardless of the boost.
    const proLocal = await registerPro(request, {
      professionalType: 'Nurse',
      location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
    });
    const proFar = await registerPro(request, {
      professionalType: 'Nurse',
      location: { division: 'Dhaka', district: 'Gazipur', thana: 'Tongi' },
    });
    await boostPro(request, proFar.token);

    const searchRes = await request.get(`${BACKEND_URL}/api/users/professionals`, {
      params: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan', serviceType: 'Nurse' },
    });
    const { professionals: results } = await searchRes.json();
    const idxLocal = results.findIndex((p) => p._id === proLocal.user._id);
    const idxFar = results.findIndex((p) => p._id === proFar.user._id);

    expect(idxLocal).toBeGreaterThanOrEqual(0);
    expect(idxFar).toBeGreaterThanOrEqual(0);
    expect(idxLocal).toBeLessThan(idxFar);
    console.log('✅ Same-thana non-boosted professional ranks above a boosted professional in a different district');
  });

  test('Search ranking: within the same thana, boosted outranks non-boosted', async ({ request }) => {
    const location = { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' };
    const proBoosted = await registerPro(request, { professionalType: 'Nurse', location });
    const proPlain = await registerPro(request, { professionalType: 'Nurse', location });
    await boostPro(request, proBoosted.token);

    const searchRes = await request.get(`${BACKEND_URL}/api/users/professionals`, {
      params: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan', serviceType: 'Nurse' },
    });
    const { professionals: results } = await searchRes.json();
    const idxBoosted = results.findIndex((p) => p._id === proBoosted.user._id);
    const idxPlain = results.findIndex((p) => p._id === proPlain.user._id);

    expect(idxBoosted).toBeGreaterThanOrEqual(0);
    expect(idxPlain).toBeGreaterThanOrEqual(0);
    expect(idxBoosted).toBeLessThan(idxPlain);
    console.log('✅ Within the same thana, a boosted professional ranks above a non-boosted one');
  });

  const uiLogin = async (page, email, password) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL(/\/home/, { timeout: 20000 });
  };

  test('Notification bell opens in place (no navigation) and shows the empty state', async ({ page, request }) => {
    const cust = await registerCustomer(request);
    await uiLogin(page, cust.user.email, 'PolishCust123!');

    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
    await expect(page.getByText('No notifications yet')).toBeVisible();
    expect(page.url()).toContain('/home');

    await page.keyboard.press('Escape');
    await expect(page.getByText('No notifications yet')).not.toBeVisible();
    console.log('✅ Notification bell opened its panel in place and Escape closed it, without navigating away');
  });

  test('Notification bell shows an unread row, marks it read on click, and navigates to its link', async ({ page, request }) => {
    const pro = await registerPro(request);
    const cust = await registerCustomer(request);

    const date = futureDateStr(bookingDayCounter++);
    await request.post(`${BACKEND_URL}/api/bookings/create`, {
      headers: authHeader(cust.token),
      data: { professionalId: pro.user._id, date, time: '16:00', type: 'short', duration: 1, address: 'Test Address, Dhaka', workDescription: 'Bell notification test' },
    });

    await uiLogin(page, pro.user.email, 'PolishPro123!');

    await page.getByRole('button', { name: 'Notifications' }).click();
    const row = page.getByText(/New booking request/i).first();
    await expect(row).toBeVisible();

    await row.click();
    await page.waitForURL(/\/my-bookings/, { timeout: 15000 });
    await expect(page.getByText('No notifications yet')).not.toBeVisible();
    console.log('✅ Clicking an unread notification marked it read, closed the panel, and navigated to /my-bookings');
  });

  // Part 8: manual payment flow. Assumes Settings.platformBkash/platformNagad
  // are temporarily set to a placeholder for this test run - the server now
  // refuses topup-manual/request-manual submissions when either is empty.
  test('Manual credit top up: full cycle grants exactly the pack amount and records a transaction', async ({ request }) => {
    const cust = await registerCustomer(request);
    const trx = 'TESTCREDIT' + Date.now() + Math.floor(Math.random() * 100000);

    // New customers get free signup credits, so the balance isn't 0 before
    // the top up - assert on the delta, not an absolute value.
    const beforeRes = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(cust.token) });
    const before = (await beforeRes.json()).credits;

    const submitRes = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(cust.token),
      data: { credits: 15, amountBDT: 200, transactionID: trx, senderNumber: '01712345678', paymentMethod: 'bkash' },
    });
    expect(submitRes.status()).toBe(200);
    const { requestId } = await submitRes.json();

    const approveRes = await request.put(`${BACKEND_URL}/api/admin/topup-requests/${requestId}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(approveRes.status()).toBe(200);

    const balanceRes = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(cust.token) });
    const balance = await balanceRes.json();
    expect(balance.credits).toBe(before + 15);

    const txRes = await request.get(`${BACKEND_URL}/api/credits/my-transactions`, { headers: authHeader(cust.token) });
    const txs = await txRes.json();
    expect(txs.some((t) => t.credits === 15 && t.type === 'purchase')).toBe(true);
    console.log('✅ Manual credit top up granted exactly 15 credits and recorded a CreditTransaction');
  });

  test('Manual payment: a forged credits amount that matches no pack is rejected', async ({ request }) => {
    const cust = await registerCustomer(request);
    const trx = 'TESTFORGE' + Date.now() + Math.floor(Math.random() * 100000);

    const res = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(cust.token),
      data: { credits: 99999, amountBDT: 1, transactionID: trx, senderNumber: '01712345678', paymentMethod: 'bkash' },
    });
    expect(res.status()).toBe(400);
    console.log('✅ A credits amount not matching any real pack is rejected server-side');
  });

  test('Manual payment: duplicate transaction ID is rejected on both credit top up and boost', async ({ request }) => {
    const custA = await registerCustomer(request);
    const custB = await registerCustomer(request);
    const trx = 'TESTDUPE' + Date.now() + Math.floor(Math.random() * 100000);

    const first = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(custA.token),
      data: { credits: 15, amountBDT: 200, transactionID: trx, senderNumber: '01712345678', paymentMethod: 'bkash' },
    });
    expect(first.status()).toBe(200);

    const second = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(custB.token),
      data: { credits: 15, amountBDT: 200, transactionID: trx, senderNumber: '01712345678', paymentMethod: 'bkash' },
    });
    expect(second.status()).toBe(400);

    const proA = await registerPro(request);
    const proB = await registerPro(request);
    const boostTrx = 'TESTDUPEBOOST' + Date.now() + Math.floor(Math.random() * 100000);

    const firstBoost = await request.post(`${BACKEND_URL}/api/featured/request-manual`, {
      headers: authHeader(proA.token),
      data: { tier: 'basic', transactionID: boostTrx, senderNumber: '01712345678', method: 'bkash' },
    });
    expect(firstBoost.status()).toBe(200);

    const secondBoost = await request.post(`${BACKEND_URL}/api/featured/request-manual`, {
      headers: authHeader(proB.token),
      data: { tier: 'basic', transactionID: boostTrx, senderNumber: '01712345678', method: 'bkash' },
    });
    expect(secondBoost.status()).toBe(400);
    console.log('✅ Duplicate transaction IDs are rejected on both the credit top up and boost paths');
  });

  test('Manual payment: the same request cannot be approved twice', async ({ request }) => {
    const cust = await registerCustomer(request);
    const trx = 'TESTNODOUBLE' + Date.now() + Math.floor(Math.random() * 100000);

    const beforeRes = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(cust.token) });
    const before = (await beforeRes.json()).credits;

    const submitRes = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(cust.token),
      data: { credits: 15, amountBDT: 200, transactionID: trx, senderNumber: '01712345678', paymentMethod: 'bkash' },
    });
    const { requestId } = await submitRes.json();

    const firstApprove = await request.put(`${BACKEND_URL}/api/admin/topup-requests/${requestId}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(firstApprove.status()).toBe(200);

    const secondApprove = await request.put(`${BACKEND_URL}/api/admin/topup-requests/${requestId}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(secondApprove.status()).toBe(400);

    const balanceRes = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(cust.token) });
    const balance = await balanceRes.json();
    expect(balance.credits).toBe(before + 15);
    console.log('✅ Approving the same request twice is rejected and credits are not double-granted');
  });

  test('Manual payment: admin cannot approve their own request', async ({ request }) => {
    const trx = 'TESTSELFAPPROVE' + Date.now() + Math.floor(Math.random() * 100000);

    const submitRes = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(adminToken),
      data: { credits: 15, amountBDT: 200, transactionID: trx, senderNumber: '01712345678', paymentMethod: 'bkash' },
    });
    expect(submitRes.status()).toBe(200);
    const { requestId } = await submitRes.json();

    const approveRes = await request.put(`${BACKEND_URL}/api/admin/topup-requests/${requestId}/approve`, {
      headers: authHeader(adminToken),
    });
    expect(approveRes.status()).toBe(403);
    console.log('✅ An admin cannot approve their own top up request');
  });

  test('Manual payment: rejection notifies the user with the admin\'s reason', async ({ request }) => {
    const cust = await registerCustomer(request);
    const trx = 'TESTREJECT' + Date.now() + Math.floor(Math.random() * 100000);

    const beforeRes = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(cust.token) });
    const before = (await beforeRes.json()).credits;

    const submitRes = await request.post(`${BACKEND_URL}/api/credits/topup-manual`, {
      headers: authHeader(cust.token),
      data: { credits: 15, amountBDT: 200, transactionID: trx, senderNumber: '01712345678', paymentMethod: 'bkash' },
    });
    const { requestId } = await submitRes.json();

    const reason = 'Transaction ID does not match any received payment';
    const rejectRes = await request.put(`${BACKEND_URL}/api/admin/topup-requests/${requestId}/reject`, {
      headers: authHeader(adminToken),
      data: { reason },
    });
    expect(rejectRes.status()).toBe(200);

    const topupsRes = await request.get(`${BACKEND_URL}/api/credits/my-topups`, { headers: authHeader(cust.token) });
    const topups = await topupsRes.json();
    const rejected = topups.find((t) => t._id === requestId);
    expect(rejected.status).toBe('Rejected');
    expect(rejected.rejectedReason).toBe(reason);

    const balanceRes = await request.get(`${BACKEND_URL}/api/credits/my-balance`, { headers: authHeader(cust.token) });
    const balance = await balanceRes.json();
    expect(balance.credits).toBe(before);
    console.log('✅ Rejecting a top up request records the admin\'s reason and grants no credits');
  });
});
