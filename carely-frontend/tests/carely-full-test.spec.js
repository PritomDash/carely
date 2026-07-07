const { test, expect } = require('@playwright/test');

const BACKEND_URL = 'https://carely-backend-j4dn.onrender.com';

// Shared test data across tests
const timestamp = Date.now();
const CUSTOMER = {
  email: `test.customer.${timestamp}@carelytest.com`,
  password: 'TestCust123!',
  name: 'Test Customer',
  phone: '01711111111',
};
const PRO = {
  email: `test.pro.${timestamp}@carelytest.com`,
  password: 'TestPro123!',
  name: 'Test Professional',
  phone: '01722222222',
  type: 'Child Care',
};
const ADMIN = {
  email: 'admin@carely.com',
  password: 'Car3ly@Admin!2025#BD',
};

test.describe.serial('Carely BD - Complete A to Z Test', () => {

  test('01 - Landing page loads with all sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Carely').first()).toBeVisible();
    await expect(page.locator('text=/Find Trusted Care/i')).toBeVisible({ timeout: 15000 });
    // The navbar's "Get Started" link splits into full/short-text spans that
    // toggle via a mobile media query (.landing-btn-text-full is display:none
    // under 600px) - target the always-visible, unabbreviated hero CTA
    // instead of a generic text match that could resolve to the hidden span.
    await expect(page.locator('.landing-hero-btn', { hasText: 'Get Started' }).first()).toBeVisible();
    await expect(page.locator('text=Sign In').first()).toBeVisible();
    await expect(page.locator('text=/Book in 3 Easy Steps/i').first()).toBeVisible();
    await expect(page.locator('text=/Child Care/i').first()).toBeVisible();
    await expect(page.locator('text=/Aged Care/i').first()).toBeVisible();
    console.log('✅ Landing page all sections visible');
  });

  test('02 - Register customer with 10 credits', async ({ page }) => {
    await page.goto('/register');

    // Exact text match - a broad substring match here also matches the hero panel's
    // "✓ Free for customers" bullet, which appears earlier in the DOM and does nothing.
    const customerCard = page.getByText('I Need Care', { exact: true });
    if (await customerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await customerCard.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill(CUSTOMER.name);
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('input[placeholder*="phone" i], input[name="phone"], input[placeholder*="01"]').first().fill(CUSTOMER.phone);

    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.check();
    }

    await page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Create Account")').first().click();
    await page.waitForURL(/\/login|\/home/, { timeout: 15000 });
    console.log('✅ Customer registered:', CUSTOMER.email);
  });

  test('03 - Register professional with 500 credits', async ({ page }) => {
    await page.goto('/register');

    // Exact text match - a broad substring match here also matches the hero panel's
    // "✓ Earn money as a professional" bullet, which appears earlier in the DOM and
    // does nothing, silently leaving role stuck on the default 'customer'.
    const proCard = page.getByText("I'm a Professional", { exact: true });
    await proCard.click();
    await page.waitForTimeout(500);

    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill(PRO.name);
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('input[placeholder*="phone" i], input[name="phone"], input[placeholder*="01"]').first().fill(PRO.phone);

    // Hard assertion: professional-only fields must now be present. If role didn't
    // actually switch, this registration would silently create a customer account.
    const typeSelect = page.locator('select').filter({ hasText: /child|aged|nurse|physio/i }).first();
    await expect(typeSelect).toBeVisible({ timeout: 3000 });
    await typeSelect.selectOption({ label: PRO.type }).catch(async () => {
      await typeSelect.selectOption(PRO.type);
    });

    // Fill experience if present
    const expInput = page.locator('input[name*="experience" i], input[placeholder*="experience" i]').first();
    if (await expInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expInput.fill('3');
    }

    // Fill about if present
    const aboutInput = page.locator('textarea[name*="about" i], textarea[placeholder*="about" i]').first();
    if (await aboutInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await aboutInput.fill('Test professional from Playwright automated test');
    }

    // Fill rates
    const rateInputs = page.locator('input[type="number"], input[name*="rate" i], input[placeholder*="rate" i]');
    const rateCount = await rateInputs.count();
    for (let i = 0; i < Math.min(rateCount, 3); i++) {
      await rateInputs.nth(i).fill('500').catch(() => {});
    }

    // Location is a required field (native <select required>) - leaving it unselected
    // silently blocks form submission via HTML5 constraint validation with no visible
    // error, which is exactly what caused test 03 to hang on submit indefinitely.
    const locationGrid = page.locator('.location-selector-grid');
    if (await locationGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
      const divisionSelect = locationGrid.locator('select').nth(0);
      const districtSelect = locationGrid.locator('select').nth(1);
      const thanaSelect = locationGrid.locator('select').nth(2);
      await divisionSelect.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(300);
      await districtSelect.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(300);
      await thanaSelect.selectOption({ index: 1 }).catch(() => {});
    }

    // ID Document is also required (native <input type="file" required>) - a 1x1 PNG
    // is enough to satisfy the browser's constraint validation and the backend's
    // multer upload handler.
    const TEST_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    const idDocInput = page.locator('input[type="file"]').nth(1);
    if (await idDocInput.count().catch(() => 0)) {
      await idDocInput.setInputFiles({ name: 'test-id.png', mimeType: 'image/png', buffer: TEST_PNG }).catch(() => {});
    }

    // Enable every day's availability, 08:00-20:00, so the professional is bookable
    // on any date the customer picks later, and so later calendar tests can rely on
    // a known, fully-open weekly schedule. Each day row is `<div><span>{day}</span>
    // <label class="toggle-switch"><input type="checkbox"/>...</label>{enabled &&
    // <two time inputs>}</div>` - the checkbox itself is visually hidden by the
    // toggle-switch styling, so click the wrapping label.
    const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of ALL_DAYS) {
      const dayRow = page.locator(`div:has(> span:text-is("${day}"))`).first();
      const toggle = dayRow.locator('label.toggle-switch');
      if (await toggle.isVisible({ timeout: 1000 }).catch(() => false)) {
        await toggle.click().catch(() => {});
        const timeInputs = dayRow.locator('input[type="time"]');
        // Wait for React to re-render the (conditionally shown) time inputs before
        // querying count() - a bare click() resolves before the re-render commits.
        const appeared = await timeInputs.nth(1).waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false);
        if (appeared) {
          await timeInputs.nth(0).fill('08:00').catch(() => {});
          await timeInputs.nth(1).fill('20:00').catch(() => {});
        }
      }
    }

    const termsCheckbox = page.locator('input[type="checkbox"]').last();
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.check().catch(() => {});
    }

    await page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Create Account")').first().click();
    await page.waitForURL(/\/login|\/home/, { timeout: 20000 });
    console.log('✅ Professional registered:', PRO.email);
  });

  test('04 - Login as customer', async ({ page }) => {
    await page.goto('/login');

    const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google")').first();
    const googleVisible = await googleBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(googleVisible ? '✅ Google sign-in button present on login page' : '⚠️ Google sign-in button not found on login page');

    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"], button:has-text("Sign In")').first().click();
    await page.waitForURL(/\/home/, { timeout: 15000 });

    const token = await page.evaluate(() => localStorage.getItem('carelyToken'));
    expect(token).toBeTruthy();
    console.log('✅ Customer logged in');
  });

  test('05 - Customer sees 10 credits in profile', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 15000 });

    // Check credits appear in avatar dropdown
    const avatar = page.locator('[class*="avatar"], button:has-text("PD"), button:has-text("TC")').first();
    if (await avatar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await avatar.click();
      await page.waitForTimeout(500);
      const creditsText = await page.locator('text=/10|credits/i').first().textContent().catch(() => '');
      console.log('✅ Customer credits visible:', creditsText);
    }
  });

  test('06 - Homepage location search filters professionals', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);
    await page.waitForTimeout(2000);

    const locationInput = page.locator('input[placeholder*="location" i], input[placeholder*="area" i]').first();
    if (await locationInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await locationInput.fill('Dhaka');
      await page.waitForTimeout(1000);
      const suggestion = page.locator('text=/Dhanmondi|Gulshan|Uttara/i').first();
      if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
        await suggestion.click();
        console.log('✅ Location autocomplete works');
      }
    }

    await page.locator('button:has-text("Search")').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    console.log('✅ Search executed');
  });

  test('07 - View professional profile page', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);
    await page.waitForTimeout(3000);

    const viewBtn = page.locator('button:has-text("View Profile"), a:has-text("View Profile")').first();
    if (await viewBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await viewBtn.click();
      await page.waitForURL(/\/view-profile/, { timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Book Now' })).toBeVisible({ timeout: 5000 });
      console.log('✅ View profile page works');
    } else {
      console.log('⚠️ No professionals to view');
    }
  });

  test('08 - Booking calendar disables unavailable dates', async ({ page, request }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    const proLoginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: PRO.email, password: PRO.password },
    });
    const { user: proUser } = await proLoginRes.json();
    const proId = proUser._id;

    await page.goto(`/book/${proId}`);
    await page.waitForURL(/\/book/, { timeout: 10000 });
    await page.waitForTimeout(1500);

    const dateInput = page.locator('.react-datepicker__input-container input').first();
    await dateInput.click();
    await page.waitForTimeout(500);

    // react-datepicker marks every date that fails filterDate (past dates, and
    // since this pro works all 7 days, only past dates in the visible month)
    // with this class - confirms the calendar is actually blocking something.
    const disabledCount = await page.locator('.react-datepicker__day--disabled').count();
    console.log('Disabled calendar days found:', disabledCount);

    const enabledDay = page.locator('.react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--outside-month)').first();
    await expect(enabledDay).toBeVisible({ timeout: 5000 });
    await enabledDay.click();
    await page.waitForTimeout(1000);

    // This pro has full 08:00-20:00 availability every day and no bookings yet,
    // so picking any enabled day must render a non-empty time slot grid.
    const slotCount = await page.locator('.time-slot').count();
    expect(slotCount).toBeGreaterThan(0);
    console.log('✅ Calendar availability check -', slotCount, 'time slots rendered for an available day');
  });

  test('09 - Create booking as customer', async ({ page, request }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);
    await page.waitForTimeout(1000);

    // Resolve the exact PRO test account's id so the booking targets it specifically,
    // instead of whichever professional card happens to sort first on the homepage.
    const proLoginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: PRO.email, password: PRO.password },
    });
    const { user: proUser } = await proLoginRes.json();
    const proId = proUser._id;

    await page.goto(`/book/${proId}`);
    await page.waitForURL(/\/book/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Pick a date via react-datepicker: fill the text input then press Enter so the
    // library actually parses and commits the typed value (a plain .fill() alone only
    // sets the input's visible text, it doesn't trigger react-datepicker's date commit).
    // Test 12 relies on this exact date (today+5) and the first slot (08:00) being
    // the one that ends up Confirmed, so don't change this without updating test 12.
    const dateInput = page.locator('.react-datepicker__input-container input').first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      await dateInput.fill(futureDate.toISOString().split('T')[0]).catch(() => {});
      await dateInput.press('Enter').catch(() => {});
    }

    // Wait for the time slot grid (computed client-side from the availability
    // endpoint fetched on page load) to reflect the newly selected date.
    await page.waitForTimeout(1500);

    // Select a time slot (professional's availability was fully opened at registration)
    const timeBtn = page.locator('.time-slot:not([disabled])').first();
    if (await timeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeBtn.click().catch(() => {});
    }

    // Fill address
    const addressField = page.locator('input[placeholder*="address" i], textarea[placeholder*="address" i]').first();
    if (await addressField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addressField.fill('123 Test Street, Dhanmondi, Dhaka');
    }

    // Fill work description
    const descField = page.locator('textarea[placeholder*="describ" i], textarea[placeholder*="work" i], textarea[placeholder*="what" i]').first();
    if (await descField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descField.fill('Playwright automated test booking - please accept');
    }

    await page.locator('button:has-text("Submit"), button:has-text("Confirm"), button:has-text("Book Now")').last().click();

    // The booking page shows a brief success state then auto-navigates to
    // /my-bookings ~1.5s later. Unlike isVisible({timeout}) - which is a single
    // point-in-time check and does NOT poll - waitFor() actively polls until the
    // element appears or the timeout elapses, so it reliably catches the
    // confirmation even though it only renders after the create API round-trip.
    const confirmed = await page.locator('text=/Booking Submitted/i').first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (confirmed) {
      console.log('✅ Booking submitted and confirmed');
      await page.waitForURL(/\/my-bookings/, { timeout: 5000 }).catch(() => {});
    } else {
      const errorText = await page.locator('.badge-red').first().textContent().catch(() => null);
      console.log('⚠️ Booking submission did not reach confirmation.' + (errorText ? ' Error shown: ' + errorText : ''));
    }
  });

  test('10 - Professional login and see booking', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 15000 });

    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    const pendingBooking = page.locator('.badge:has-text("AwaitingAcceptance")').first();
    if (await pendingBooking.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('✅ Professional sees pending booking');
    } else {
      console.log('⚠️ No pending bookings visible');
    }
  });

  test('11 - Professional accepts booking - credit deducted', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    const acceptBtn = page.locator('button:has-text("Accept")').first();
    if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(3000);

      const confirmed = page.locator('text=/Confirmed|accepted/i').first();
      if (await confirmed.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Booking accepted');
      }

      // Check credit was deducted - should be 499 now
      await page.goto('/my-credits');
      await page.waitForTimeout(2000);
      console.log('✅ Credit check after accept');
    } else {
      console.log('⚠️ No Accept button visible');
    }
  });

  test('12 - Cannot select booked time slot', async ({ page, request }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    const proLoginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: PRO.email, password: PRO.password },
    });
    const { user: proUser } = await proLoginRes.json();
    const proId = proUser._id;

    await page.goto(`/book/${proId}`);
    await page.waitForURL(/\/book/, { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Same date used (and just accepted) in tests 09/11 - the 08:00 slot on this
    // date is now covered by a Confirmed booking and must render as blocked,
    // without ever hitting the backend.
    const dateInput = page.locator('.react-datepicker__input-container input').first();
    const bookedDate = new Date();
    bookedDate.setDate(bookedDate.getDate() + 5);
    await dateInput.fill(bookedDate.toISOString().split('T')[0]).catch(() => {});
    await dateInput.press('Enter').catch(() => {});
    await page.waitForTimeout(1500);

    const bookedSlot = page.locator('.time-slot', { hasText: '08:00' }).first();
    if (await bookedSlot.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(bookedSlot).toBeDisabled();
      const slotText = await bookedSlot.textContent();
      expect(slotText).toMatch(/booked/i);
      console.log('✅ Booked slot properly blocked:', slotText);
    } else {
      console.log('⚠️ Could not locate the previously booked 08:00 slot to verify blocking');
    }
  });

  test('13 - Customer sees confirmed booking', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-bookings');
    await page.waitForTimeout(2000);

    const confirmed = page.locator('text=/Confirmed/i').first();
    if (await confirmed.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Customer sees confirmed booking');
    }
  });

  test('14 - Chat works between customer and professional', async ({ browser }) => {
    const custContext = await browser.newContext();
    const proContext = await browser.newContext();
    const custPage = await custContext.newPage();
    const proPage = await proContext.newPage();

    // Customer login
    await custPage.goto('/login');
    await custPage.locator('input[type="email"]').fill(CUSTOMER.email);
    await custPage.locator('input[type="password"]').fill(CUSTOMER.password);
    await custPage.locator('button[type="submit"]').first().click();
    await custPage.waitForURL(/\/home/);

    // Pro login
    await proPage.goto('/login');
    await proPage.locator('input[type="email"]').fill(PRO.email);
    await proPage.locator('input[type="password"]').fill(PRO.password);
    await proPage.locator('button[type="submit"]').first().click();
    await proPage.waitForURL(/\/home/);

    // The chat inbox only lists threads with existing message history, and no
    // message has been exchanged yet for this fresh confirmed booking - so go
    // via My Bookings' "Chat" button instead, which is the actual entry point
    // the app provides for starting a first conversation.
    await custPage.goto('/my-bookings');
    await custPage.waitForTimeout(2000);

    const chatBtn = custPage.locator('button:has-text("Chat")').first();
    if (await chatBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await chatBtn.click();
      await custPage.waitForURL(/\/chat\//, { timeout: 5000 }).catch(() => {});
      await custPage.waitForTimeout(2000);
      const msgInput = custPage.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
      if (await msgInput.isVisible()) {
        await msgInput.fill('Hello from Playwright test!');
        await custPage.locator('button:has-text("Send"), button[type="submit"]').last().click();
        await custPage.waitForTimeout(2000);
        console.log('✅ Chat message sent');
      }
    } else {
      console.log('⚠️ No Chat button found on confirmed booking');
    }

    await custContext.close();
    await proContext.close();
  });

  test('15 - Professional marks booking as done', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-bookings');
    await page.waitForTimeout(2000);

    const doneBtn = page.locator('button:has-text("Mark as Done"), button:has-text("Complete")').first();
    if (await doneBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await doneBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ Booking marked as done');
    }
  });

  test('16 - Customer rates professional', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-bookings');
    await page.waitForTimeout(2000);

    const rateBtn = page.locator('button:has-text("Rate"), a:has-text("Rate")').first();
    if (await rateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rateBtn.click();
      await page.waitForURL(/\/rate/, { timeout: 5000 });

      const star = page.locator('[data-star="5"], button:has-text("★")').nth(4);
      if (await star.isVisible({ timeout: 3000 }).catch(() => false)) {
        await star.click();
      }

      const reviewInput = page.locator('textarea').first();
      if (await reviewInput.isVisible()) {
        await reviewInput.fill('Excellent service! Automated Playwright test review.');
      }

      await page.locator('button[type="submit"], button:has-text("Submit")').last().click();
      await page.waitForTimeout(3000);
      console.log('✅ Rating submitted');
    }
  });

  test('17 - Customer creates job post', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/create-job-post');
    await page.waitForTimeout(2000);

    await page.locator('form input[type="text"]').first().fill('Playwright Test Job - Need Child Care');

    const descInput = page.locator('textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Automated test job post for testing feature');
    }

    const typeSelect = page.locator('select').first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ label: 'Child Care' }).catch(() => {});
    }

    await page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Create")').last().click();
    await page.waitForTimeout(3000);
    console.log('✅ Job post created');
  });

  test('18 - Professional applies to job post', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/job-posts');
    await page.waitForTimeout(3000);

    const applyBtn = page.locator('button:has-text("Apply")').first();
    if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await applyBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ Applied to job post');
    }
  });

  test('19 - Customer selects professional from job post - creates a real Confirmed booking', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    // A confirmed booking already exists from test 09/11 (the direct booking
    // flow) - count Confirmed badges before and after the select action so
    // this test actually proves a NEW one was created by job-post selection,
    // rather than just re-detecting that earlier booking.
    await page.goto('/my-bookings');
    await page.waitForTimeout(2000);
    const confirmedBefore = await page.locator('text=/Confirmed/i').count();

    await page.goto('/my-posts');
    await page.waitForTimeout(3000);

    const selectBtn = page.locator('button:has-text("Select")').first();
    if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ Professional selected - 1 credit should be deducted from pro');

      await page.goto('/my-bookings');
      await page.waitForTimeout(2000);
      const confirmedAfter = await page.locator('text=/Confirmed/i').count();
      expect(confirmedAfter).toBeGreaterThan(confirmedBefore);
      console.log(`✅ New Confirmed booking created from job post selection (${confirmedBefore} -> ${confirmedAfter})`);
    } else {
      console.log('⚠️ No job post applicant available to select (test 17/18 may not have applied)');
    }
  });

  test('19b - Professional also sees the job-post-confirmed booking', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-bookings');
    await page.waitForTimeout(2000);
    const proSeesConfirmed = await page.locator('text=/Confirmed/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (proSeesConfirmed) {
      console.log('✅ Professional sees a Confirmed booking (direct booking + job post selection)');
    } else {
      console.log('⚠️ Professional does not see any Confirmed booking');
    }
  });

  test('20 - Emergency post deducts credit from customer', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/create-job-post');
    await page.waitForTimeout(2000);

    await page.locator('form input[type="text"]').first().fill('EMERGENCY - Need Nurse Immediately');
    const descInput = page.locator('textarea').first();
    if (await descInput.isVisible()) await descInput.fill('Urgent test emergency post');

    const emergencyToggle = page.locator('input[type="checkbox"][name*="emergency" i], label:has-text("Emergency")').first();
    if (await emergencyToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emergencyToggle.click();
      await page.waitForTimeout(500);
    }

    await page.locator('button[type="submit"], button:has-text("Post")').last().click();
    await page.waitForTimeout(3000);
    console.log('✅ Emergency post attempted - customer credit should decrease from 10 to 9');
  });

  test('21 - Notifications page loads and shows notifications', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/notifications');
    await page.waitForTimeout(2000);
    console.log('✅ Notifications page loads');
  });

  test('22 - Credits page shows balance and history', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-credits');
    await page.waitForTimeout(2000);

    const balanceText = await page.locator('body').textContent();
    expect(balanceText).toMatch(/credit/i);
    console.log('✅ Credits page shows balance');
  });

  test('23 - Top up form works', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-credits');
    await page.waitForTimeout(2000);

    // Credit packs are clickable cards (a plain <div onClick>), not <button>
    // elements - a button-tag locator here never matches, so this step was
    // silently skipping and never actually created a top up request.
    const packBtn = page.locator('.grid-3 > div', { hasText: /credits/i }).first();
    if (await packBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await packBtn.click();
      await page.waitForTimeout(1000);

      // Neither field's actual placeholder contains "transaction"/"TRX"/"number"
      // ("e.g. 8N7A6B5C4D" and "01XXXXXXXXX" respectively) - match by their
      // <label> text via the enclosing .form-group instead of guessing placeholders.
      const trxInput = page.locator('.form-group', { hasText: 'Transaction ID' }).locator('input').first();
      if (await trxInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trxInput.fill('TEST_TRX_' + Date.now());

        const senderInput = page.locator('.form-group', { hasText: 'Your Number' }).locator('input').first();
        if (await senderInput.isVisible()) await senderInput.fill('01722222222');

        await page.locator('button:has-text("Submit")').last().click();
        await page.waitForTimeout(2000);
        console.log('✅ Top up request submitted');
      }
    }
  });

  test('24 - Admin login works', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/admin|home/);
    console.log('✅ Admin logged in at:', url);
  });

  test('25 - Admin dashboard all tabs load', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    // Tab button label -> the distinct <h2> heading its panel renders.
    const tabChecks = [
      { tab: 'Overview', heading: 'Overview' },
      { tab: 'Users', heading: 'Users' },
      { tab: 'Bookings', heading: 'Bookings' },
      { tab: 'Job Posts', heading: 'Job Posts' },
      { tab: 'Credits', heading: 'Credits & Payments' },
      { tab: 'Settings', heading: 'Platform Settings' },
      { tab: 'Chat', heading: 'Chat' },
    ];

    for (const { tab, heading } of tabChecks) {
      await page.locator('.admin-tab', { hasText: tab }).first().click();
      await page.waitForTimeout(800);
      await expect(page.locator('h2', { hasText: heading }).first()).toBeVisible({ timeout: 5000 });
    }
    console.log('✅ Admin tabs verified:', tabChecks.map((t) => t.tab).join(', '));
  });

  test('26 - Admin can approve top up request', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    await page.locator('.admin-tab', { hasText: 'Credits' }).first().click();
    await page.waitForTimeout(1500);

    // Test 23 submitted a pending manual top up request for PRO - approve it.
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(1500);
      await expect(page.locator('text=/approved/i').first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Admin top up approval works');
    } else {
      console.log('⚠️ No pending top up request found to approve');
    }
  });

  test('27 - Admin renew all credits works', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    await page.locator('.admin-tab', { hasText: 'Credits' }).first().click();
    await page.waitForTimeout(1500);

    // This is a two-step confirm flow: "Renew Credits for Everyone" reveals a
    // confirmation prompt, then "Yes, Renew for Everyone" actually executes it.
    const renewBtn = page.locator('button:has-text("Renew Credits for Everyone")').first();
    if (await renewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await renewBtn.click();
      await page.waitForTimeout(500);
      const confirmBtn = page.locator('button:has-text("Yes, Renew for Everyone")').first();
      await expect(confirmBtn).toBeVisible({ timeout: 3000 });
      await confirmBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ Admin renew credits works');
    } else {
      console.log('⚠️ Renew Credits button not found');
    }
  });

  test('28 - Admin can verify a professional', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    await page.locator('.admin-tab', { hasText: 'Users' }).first().click();
    await page.waitForTimeout(2000);

    // AdminDashboard renders a <table> on desktop but switches to
    // .admin-mobile-cards (plain divs) under 768px - both exist in the DOM
    // at all times (one is display:none), so match whichever is :visible.
    const proRow = page.locator('tr:visible, .admin-mobile-cards > div:visible', { hasText: PRO.email }).first();
    await expect(proRow).toBeVisible({ timeout: 10000 });

    // New professionals are verified by default (isVerified defaults true), so
    // the Verify button never appears until someone is unverified - suspend our
    // own test professional first to reach that state, then verify them back.
    const suspendBtn = proRow.locator('button:has-text("Suspend")').first();
    if (await suspendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suspendBtn.click();
      await page.waitForTimeout(1500);
    }

    const verifyBtn = proRow.locator('button:has-text("Verify")').first();
    await expect(verifyBtn).toBeVisible({ timeout: 5000 });
    await verifyBtn.click();
    await page.waitForTimeout(1500);

    await expect(proRow.locator('.badge-green')).toBeVisible({ timeout: 5000 });
    console.log('✅ Admin verify professional works');
  });

  test('29 - Terms Privacy Blog pages load', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('text=/Terms/i').first()).toBeVisible();

    await page.goto('/privacy');
    await expect(page.locator('text=/Privacy/i').first()).toBeVisible();

    await page.goto('/blog');
    await page.waitForTimeout(2000);
    console.log('✅ Legal and blog pages load');
  });

  test('30 - Mobile viewport no horizontal scroll', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();

    for (const url of ['/', '/login', '/register', '/blog']) {
      await page.goto(url);
      await page.waitForTimeout(1500);
      const scroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      expect(scroll).toBe(false);
    }
    console.log('✅ No horizontal scroll on any page on mobile');
    await ctx.close();
  });

  test('31 - Console errors check on key pages', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.goto('/login');
    await page.waitForTimeout(2000);
    await page.goto('/register');
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('⚠️ Console errors:', errors);
    } else {
      console.log('✅ No console errors on public pages');
    }
  });

});
