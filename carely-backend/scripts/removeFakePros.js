// Safely removes Playwright/test-generated PROFESSIONAL accounts from
// production so real recruited pros don't see fake colleagues.
//
// Patterns below are taken directly from carely-frontend/tests/*.spec.js -
// every account those tests create (customer or professional) uses a
// @carelytest.com address (test.pro.<ts>@, monetize.pro.<ts>@,
// polish.pro.<n>@, etc). The name patterns are a backstop for any
// differently-seeded test data that doesn't happen to use that domain.
//
// SAFETY:
//   - Only ever considers role === 'professional'. Customer accounts are
//     never loaded, filtered, or touched by any query in this file.
//   - Any professional whose name contains "Pritom" (case-insensitive) is
//     always excluded from deletion, regardless of email.
//   - The admin account is structurally impossible to match (role is never
//     'professional') but is excluded explicitly anyway as a backstop.
//   - Defaults to a dry run that only prints what it would do. Deletion
//     only happens with an explicit --confirm flag.
//
// Usage:
//   MONGODB_URI=... node scripts/removeFakePros.js            (dry run)
//   MONGODB_URI=... node scripts/removeFakePros.js --confirm  (deletes)

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Booking = require('../models/Booking');
const JobPost = require('../models/JobPost');
const Rating = require('../models/Rating');
const ChatMessage = require('../models/chatMessage');
const Notification = require('../models/Notification');
const CreditTransaction = require('../models/CreditTransaction');
const FeaturedRequest = require('../models/FeaturedRequest');
const TopUpRequest = require('../models/TopUpRequest');

const CONFIRM = process.argv.includes('--confirm');
const ADMIN_EMAIL = 'admin@carely.com';

const TEST_EMAIL_PATTERNS = [
  /@carelytest\.com$/i,
  /@carely\.test$/i,
  /test\.pro\./i,
  /test\.customer\./i,
  /playwright/i,
];

const TEST_NAME_PATTERNS = [
  /^test /i,
  /test professional/i,
  /\btest pro\b/i,
  /^polish (pro|customer)/i,
  /^monetize .*(pro|customer)/i,
  /\bboosted test pro\b/i,
  /\bnonboosted test pro\b/i,
  /zero credit customer/i,
];

const isTestAccount = (u) =>
  TEST_EMAIL_PATTERNS.some((re) => re.test(u.email || '')) ||
  TEST_NAME_PATTERNS.some((re) => re.test(u.name || ''));

const isProtected = (u) =>
  /pritom/i.test(u.name || '') || (u.email || '').toLowerCase() === ADMIN_EMAIL;

const fmt = (u, i) => `${i + 1}. ${u.name} | ${u.email} | ${u.role} | ${u.createdAt ? u.createdAt.toISOString() : 'unknown'}`;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting - refusing to guess a connection string.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const allPros = await User.find({ role: 'professional' }).select('name email role createdAt');
  const customerCountBefore = await User.countDocuments({ role: 'customer' });

  const toDelete = allPros.filter((p) => isTestAccount(p) && !isProtected(p));
  const keptPritom = allPros.filter((p) => isProtected(p));
  const otherKept = allPros.filter((p) => !isTestAccount(p) && !isProtected(p));

  console.log(`\n=== removeFakePros.js — ${CONFIRM ? 'LIVE RUN (will delete)' : 'DRY RUN (no deletions)'} ===\n`);

  console.log(`Professional accounts targeted for deletion (${toDelete.length}):`);
  if (toDelete.length === 0) console.log('  (none matched)');
  toDelete.forEach((p, i) => console.log('  ' + fmt(p, i)));

  console.log(`\nPritom pros being KEPT (${keptPritom.length}):`);
  if (keptPritom.length === 0) console.log('  (none found - check this is expected!)');
  keptPritom.forEach((p, i) => console.log('  ' + fmt(p, i)));

  if (otherKept.length > 0) {
    console.log(`\nOther professionals NOT matching a test pattern, also being kept (${otherKept.length}) - review these:`);
    otherKept.forEach((p, i) => console.log('  ' + fmt(p, i)));
  }

  console.log(`\nTotal customers in DB: ${customerCountBefore} — customers: untouched\n`);

  if (!CONFIRM) {
    console.log('Dry run only - nothing was deleted. Re-run with --confirm to actually delete the accounts listed above.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Deleting ${toDelete.length} professional accounts and their related data...\n`);
  for (const pro of toDelete) {
    const pid = pro._id;
    await Promise.all([
      Booking.deleteMany({ professional: pid }),
      Rating.deleteMany({ professional: pid }),
      ChatMessage.deleteMany({ $or: [{ sender: pid }, { recipient: pid }] }),
      Notification.deleteMany({ user: pid }),
      CreditTransaction.deleteMany({ professional: pid }),
      FeaturedRequest.deleteMany({ user: pid }),
      TopUpRequest.deleteMany({ user: pid }),
      JobPost.updateMany({ 'applicants.professional': pid }, { $pull: { applicants: { professional: pid } } }),
      JobPost.updateMany({ selectedPro: pid }, { $set: { selectedPro: null } }),
    ]);
    await User.deleteOne({ _id: pid });
    console.log(`  deleted: ${pro.name} (${pro.email})`);
  }

  const professionalsRemaining = await User.countDocuments({ role: 'professional' });
  const customerCountAfter = await User.countDocuments({ role: 'customer' });

  console.log(`\nDone.`);
  console.log(`Professionals remaining: ${professionalsRemaining}`);
  console.log(`Customers before: ${customerCountBefore}, after: ${customerCountAfter} (must match)`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
