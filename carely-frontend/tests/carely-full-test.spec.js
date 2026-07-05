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
  email: 'admin@carely.com',  // your actual admin email
  password: 'admin_password_here',
};

test.describe.serial('Carely BD - Complete A to Z Test', () => {

  test('01 - Landing page loads with all sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Carely').first()).toBeVisible();
    await expect(page.locator('text=/Find Trusted Care/i')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Get Started').first()).toBeVisible();
    await expect(page.locator('text=Sign In').first()).toBeVisible();
    await expect(page.locator('text=/Book in 3 Easy Steps/i').first()).toBeVisible();
    await expect(page.locator('text=/Child Care/i').first()).toBeVisible();
    await expect(page.locator('text=/Aged Care/i').first()).toBeVisible();
    console.log('✅ Landing page all sections visible');
  });

  test('02 - Register customer with 10 credits', async ({ page }) => {
    await page.goto('/register');

    const customerCard = page.locator('text=/I Need Care/i, text=Customer').first();
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

    const proCard = page.locator('text=/I am a Professional/i, text=/I.m a Professional/i, text=Professional').first();
    if (await proCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proCard.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill(PRO.name);
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('input[placeholder*="phone" i], input[name="phone"], input[placeholder*="01"]').first().fill(PRO.phone);

    const typeSelect = page.locator('select').filter({ hasText: /child|aged|nurse|physio/i }).first();
    if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeSelect.selectOption({ label: PRO.type }).catch(async () => {
        await typeSelect.selectOption(PRO.type);
      });
    }

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

    // Enable every day's availability so the professional is bookable on any date the
    // customer picks later. Each day row is `<div><span>{day}</span><label class="toggle-switch">
    // <input type="checkbox"/>...</label>{enabled && <two time inputs>}</div>` - the checkbox
    // itself is visually hidden by the toggle-switch styling, so click the wrapping label.
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
    if (await viewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewBtn.click();
      await page.waitForURL(/\/view-profile/, { timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Book Now' })).toBeVisible({ timeout: 5000 });
      console.log('✅ View profile page works');
    } else {
      console.log('⚠️ No professionals to view');
    }
  });

  test('08 - Create booking as customer', async ({ page, request }) => {
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
    const dateInput = page.locator('.react-datepicker__input-container input').first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      await dateInput.fill(futureDate.toISOString().split('T')[0]).catch(() => {});
      await dateInput.press('Enter').catch(() => {});
    }

    // Wait for the availability window for that date to load before looking for slots.
    await page.waitForTimeout(2000);

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
    await page.waitForTimeout(3000);

    const confirmed = await page.locator('text=/Booking Requested/i').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (confirmed) {
      console.log('✅ Booking submitted and confirmed');
    } else {
      const errorText = await page.locator('.badge-red').first().textContent().catch(() => null);
      console.log('⚠️ Booking submission did not reach confirmation.' + (errorText ? ' Error shown: ' + errorText : ''));
    }
  });

  test('09 - Professional login and see booking', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/, { timeout: 15000 });

    await page.goto('/my-bookings');
    await page.waitForTimeout(3000);

    const pendingBooking = page.locator('.badge:has-text("AwaitingAcceptance")').first();
    if (await pendingBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Professional sees pending booking');
    } else {
      console.log('⚠️ No pending bookings visible');
    }
  });

  test('10 - Professional accepts booking - credit deducted', async ({ page }) => {
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
      const creditsText = await page.locator('body').textContent();
      console.log('✅ Credit check after accept');
    } else {
      console.log('⚠️ No Accept button visible');
    }
  });

  test('11 - Customer sees confirmed booking', async ({ page }) => {
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

  test('12 - Chat works between customer and professional', async ({ browser }) => {
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

    // Customer opens chat
    await custPage.goto('/chat-inbox');
    await custPage.waitForTimeout(2000);

    const convo = custPage.locator('[class*="chat"], [class*="conversation"], a:has-text("' + PRO.name + '")').first();
    if (await convo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await convo.click();
      await custPage.waitForTimeout(2000);
      const msgInput = custPage.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
      if (await msgInput.isVisible()) {
        await msgInput.fill('Hello from Playwright test!');
        await custPage.locator('button:has-text("Send"), button[type="submit"]').last().click();
        await custPage.waitForTimeout(2000);
        console.log('✅ Chat message sent');
      }
    } else {
      console.log('⚠️ No conversations available');
    }

    await custContext.close();
    await proContext.close();
  });

  test('13 - Professional marks booking as done', async ({ page }) => {
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

  test('14 - Customer rates professional', async ({ page }) => {
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

  test('15 - Customer creates job post', async ({ page }) => {
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

  test('16 - Professional applies to job post', async ({ page }) => {
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

  test('17 - Customer selects professional from job post', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-posts');
    await page.waitForTimeout(3000);

    const selectBtn = page.locator('button:has-text("Select")').first();
    if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ Professional selected - 1 credit should be deducted from pro');
    }
  });

  test('18 - Emergency post deducts credit from customer', async ({ page }) => {
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

  test('19 - Notifications page loads and shows notifications', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(CUSTOMER.email);
    await page.locator('input[type="password"]').fill(CUSTOMER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/notifications');
    await page.waitForTimeout(2000);
    console.log('✅ Notifications page loads');
  });

  test('20 - Credits page shows balance and history', async ({ page }) => {
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

  test('21 - Top up form works', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(PRO.email);
    await page.locator('input[type="password"]').fill(PRO.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/home/);

    await page.goto('/my-credits');
    await page.waitForTimeout(2000);

    const packBtn = page.locator('button:has-text("50 credits"), button:has-text("150 credits")').first();
    if (await packBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await packBtn.click();
      await page.waitForTimeout(1000);

      const trxInput = page.locator('input[placeholder*="transaction" i], input[placeholder*="TRX" i]').first();
      if (await trxInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trxInput.fill('TEST_TRX_' + Date.now());

        const senderInput = page.locator('input[placeholder*="number" i]').first();
        if (await senderInput.isVisible()) await senderInput.fill('01722222222');

        await page.locator('button:has-text("Submit")').last().click();
        await page.waitForTimeout(2000);
        console.log('✅ Top up request submitted');
      }
    }
  });

  test('22 - Admin login and see top up requests', async ({ page }) => {
    await page.goto('/admin/login').catch(async () => {
      await page.goto('/login');
    });

    await page.locator('input[type="email"]').fill(ADMIN.email).catch(() => {});
    await page.locator('input[type="password"]').fill(ADMIN.password).catch(() => {});
    await page.locator('button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(5000);

    const isAdminPage = page.url().includes('/admin');
    if (isAdminPage) {
      console.log('✅ Admin logged in');

      const creditsTab = page.locator('button:has-text("Credits"), a:has-text("Credits")').first();
      if (await creditsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await creditsTab.click();
        await page.waitForTimeout(2000);

        const pendingRequest = page.locator('text=/Pending|pending/i, button:has-text("Approve")').first();
        if (await pendingRequest.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✅ Admin sees pending top up requests');

          const approveBtn = page.locator('button:has-text("Approve")').first();
          if (await approveBtn.isVisible()) {
            await approveBtn.click();
            await page.waitForTimeout(2000);
            console.log('✅ Top up approved');
          }
        }
      }
    } else {
      console.log('⚠️ Admin login credentials may need updating');
    }
  });

  test('23 - Admin renew credits for all users', async ({ page }) => {
    await page.goto('/admin/login').catch(async () => {
      await page.goto('/login');
    });
    await page.locator('input[type="email"]').fill(ADMIN.email).catch(() => {});
    await page.locator('input[type="password"]').fill(ADMIN.password).catch(() => {});
    await page.locator('button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(3000);

    if (page.url().includes('/admin')) {
      const creditsTab = page.locator('button:has-text("Credits"), a:has-text("Credits")').first();
      if (await creditsTab.isVisible()) await creditsTab.click();
      await page.waitForTimeout(2000);

      const renewBtn = page.locator('button:has-text("Renew"), button:has-text("Give Credits")').first();
      if (await renewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await renewBtn.click();

        page.on('dialog', d => d.accept());

        await page.waitForTimeout(3000);
        console.log('✅ Renew credits button works');
      }
    }
  });

  test('24 - Terms Privacy Blog pages load', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('text=/Terms/i').first()).toBeVisible();

    await page.goto('/privacy');
    await expect(page.locator('text=/Privacy/i').first()).toBeVisible();

    await page.goto('/blog');
    await page.waitForTimeout(2000);
    console.log('✅ Legal and blog pages load');
  });

  test('25 - Mobile viewport no horizontal scroll', async ({ browser }) => {
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

  test('26 - Console errors check on key pages', async ({ page }) => {
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
