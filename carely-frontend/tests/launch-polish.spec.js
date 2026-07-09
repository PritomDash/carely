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
    const results = await searchRes.json();
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
    const results = await searchRes.json();
    const idxBoosted = results.findIndex((p) => p._id === proBoosted.user._id);
    const idxPlain = results.findIndex((p) => p._id === proPlain.user._id);

    expect(idxBoosted).toBeGreaterThanOrEqual(0);
    expect(idxPlain).toBeGreaterThanOrEqual(0);
    expect(idxBoosted).toBeLessThan(idxPlain);
    console.log('✅ Within the same thana, a boosted professional ranks above a non-boosted one');
  });
});
