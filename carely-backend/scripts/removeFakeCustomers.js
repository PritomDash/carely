// Safely removes Playwright/test-generated CUSTOMER accounts from
// production so admin analytics reflect real numbers.
//
// Patterns below are taken directly from carely-frontend/tests/*.spec.js -
// every account those tests create (customer or professional) uses a
// @carelytest.com address (test.customer.<ts>@, monetize.customer.<ts>@,
// polish.customer.<n>@, etc). The name patterns are a backstop for any
// differently-seeded test data that doesn't happen to use that domain.
//
// SAFETY:
//   - Only ever considers role === 'customer'. Professional accounts are
//     never loaded, filtered, or touched by any query in this file - they
//     were already cleaned separately (see removeFakePros.js).
//   - Any customer whose name contains "Hridi" or "Prapti" (case-insensitive)
//     is always excluded from deletion, regardless of email.
//   - The admin account is structurally impossible to match (role is never
//     'customer') but is excluded explicitly anyway as a backstop.
//   - A customer that doesn't match a test email/name pattern is NEVER
//     deleted, even if unnamed/unfamiliar - it's printed in a separate
//     "kept - looks real" list for manual review instead of being touched.
//   - Defaults to a dry run that only prints what it would do. Deletion
//     only happens with an explicit --confirm flag.
//
// Usage:
//   MONGODB_URI=... node scripts/removeFakeCustomers.js            (dry run)
//   MONGODB_URI=... node scripts/removeFakeCustomers.js --confirm  (deletes)

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Booking = require('../models/Booking');
const JobPost = require('../models/JobPost');
const Rating = require('../models/Rating');
const ChatMessage = require('../models/chatMessage');
const Notification = require('../models/Notification');
const CreditTransaction = require('../models/CreditTransaction');
const TopUpRequest = require('../models/TopUpRequest');

const CONFIRM = process.argv.includes('--confirm');
const ADMIN_EMAIL = 'admin@carely.com';

const TEST_EMAIL_PATTERNS = [
  /@carelytest\.com$/i,
  /@carely\.test$/i,
  /test\.customer\./i,
  /test\.pro\./i,
  /playwright/i,
];

const TEST_NAME_PATTERNS = [
  /^test /i,
  /test customer/i,
  /test professional/i,
  /^polish (pro|customer)/i,
  /^monetize .*(pro|customer)/i,
  /zero credit customer/i,
  /^debug /i,
  /^dup test/i,
  /delay test cust/i,
];

const isTestAccount = (u) =>
  TEST_EMAIL_PATTERNS.some((re) => re.test(u.email || '')) ||
  TEST_NAME_PATTERNS.some((re) => re.test(u.name || ''));

const isProtected = (u) =>
  /hridi/i.test(u.name || '') || /prapti/i.test(u.name || '') || (u.email || '').toLowerCase() === ADMIN_EMAIL;

const fmt = (u, i) => `${i + 1}. ${u.name} | ${u.email} | ${u.role} | ${u.createdAt ? u.createdAt.toISOString() : 'unknown'}`;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting - refusing to guess a connection string.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const allCustomers = await User.find({ role: 'customer' }).select('name email role createdAt');
  const professionalCountBefore = await User.countDocuments({ role: 'professional' });

  const toDelete = allCustomers.filter((c) => isTestAccount(c) && !isProtected(c));
  const keptProtected = allCustomers.filter((c) => isProtected(c));
  const keptRealLooking = allCustomers.filter((c) => !isTestAccount(c) && !isProtected(c));

  console.log(`\n=== removeFakeCustomers.js — ${CONFIRM ? 'LIVE RUN (will delete)' : 'DRY RUN (no deletions)'} ===\n`);

  console.log(`Customer accounts targeted for deletion (${toDelete.length}):`);
  if (toDelete.length === 0) console.log('  (none matched)');
  toDelete.forEach((c, i) => console.log('  ' + fmt(c, i)));

  console.log(`\nHridi / Prapti customers being KEPT (${keptProtected.length}):`);
  if (keptProtected.length === 0) console.log('  (none found - check this is expected!)');
  keptProtected.forEach((c, i) => console.log('  ' + fmt(c, i)));

  console.log(`\nOther customers kept - look real, not an obvious test account (${keptRealLooking.length}):`);
  if (keptRealLooking.length === 0) console.log('  (none)');
  keptRealLooking.forEach((c, i) => console.log('  ' + fmt(c, i)));

  console.log(`\nTotal professionals in DB: ${professionalCountBefore} — professionals: untouched\n`);
  console.log(`Customers before: ${allCustomers.length}`);
  console.log(`Customers after (if confirmed): ${allCustomers.length - toDelete.length}\n`);

  if (!CONFIRM) {
    console.log('Dry run only - nothing was deleted. Re-run with --confirm to actually delete the accounts listed above.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Deleting ${toDelete.length} customer accounts and their related data...\n`);
  for (const cust of toDelete) {
    const cid = cust._id;
    await Promise.all([
      Booking.deleteMany({ customer: cid }),
      JobPost.deleteMany({ customer: cid }),
      Rating.deleteMany({ customer: cid }),
      ChatMessage.deleteMany({ $or: [{ sender: cid }, { recipient: cid }] }),
      Notification.deleteMany({ user: cid }),
      CreditTransaction.deleteMany({ professional: cid }), // field name is generic; also used for customer-side credit transactions
      TopUpRequest.deleteMany({ user: cid }),
    ]);
    await User.deleteOne({ _id: cid });
    console.log(`  deleted: ${cust.name} (${cust.email})`);
  }

  const customersRemaining = await User.countDocuments({ role: 'customer' });
  const professionalCountAfter = await User.countDocuments({ role: 'professional' });

  console.log(`\nDone.`);
  console.log(`Customers remaining: ${customersRemaining}`);
  console.log(`Professionals before: ${professionalCountBefore}, after: ${professionalCountAfter} (must match)`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
