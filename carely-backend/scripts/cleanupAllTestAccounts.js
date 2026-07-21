// Full pre-launch account wipe: deletes EVERY account except the 8 real
// ones listed in KEEP_EMAILS below, regardless of role (customer,
// professional, or admin). This is an allowlist, not a pattern match like
// removeFakePros.js/removeFakeCustomers.js - simpler and stronger for a
// final pre-launch sweep, since "keep only these exact 8" can't miss a
// test account that happens not to match a known naming pattern.
//
// SAFETY:
//   - Defaults to a dry run that only prints the plan. Deletion only
//     happens with an explicit --confirm flag.
//   - Before touching anything, every one of the 8 KEEP_EMAILS is verified
//     to actually exist in the database. If even one is missing (e.g. a
//     typo in this file), the script stops immediately and reports it,
//     in both dry-run and --confirm mode - a typo here must never result
//     in a real account being silently deleted.
//   - Matching is case-insensitive on the exact email address only. No
//     name/role/pattern heuristics are used to decide what's "fake" -
//     everything not in KEEP_EMAILS is deleted, on purpose.
//
// Usage:
//   MONGODB_URI=... node scripts/cleanupAllTestAccounts.js            (dry run)
//   MONGODB_URI=... node scripts/cleanupAllTestAccounts.js --confirm  (deletes)

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
const FeaturedRequest = require('../models/FeaturedRequest');

const CONFIRM = process.argv.includes('--confirm');

// The only 8 accounts that survive this script. Exact email match,
// case-insensitive. Never edit this list to a pattern/regex - it must
// stay an explicit, reviewable allowlist.
const KEEP_EMAILS = [
  'dashshiuli713@gmail.com',    // CS- PRO, customer
  'hrididash2026@gmail.com',    // Hridi Dash, customer
  'sdp328993@gmail.com',        // Prapti, customer
  'dashhridi713@gmail.com',     // HRIDI DASH, customer
  'admin@carely.com',           // Carely Admin, admin
  'suchonadasprapti@gmail.com', // Suchona das prapti, customer
  'dashpritom714@gmail.com',    // pritom, customer
  'dashpritom713@gmail.com',    // Pritom Dash, professional
];
const KEEP_SET = new Set(KEEP_EMAILS.map((e) => e.toLowerCase()));

const fmt = (u) => `${u.name} | ${u.email} | ${u.role} | ${u.createdAt ? u.createdAt.toISOString() : 'unknown'}`;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting - refusing to guess a connection string.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const allUsers = await User.find({}).select('name email role createdAt');

  const byRole = { customer: 0, professional: 0, admin: 0 };
  for (const u of allUsers) byRole[u.role] = (byRole[u.role] || 0) + 1;

  console.log(`\n=== cleanupAllTestAccounts.js - ${CONFIRM ? 'LIVE RUN (will delete)' : 'DRY RUN (no deletions)'} ===\n`);
  console.log(`Total accounts in DB: ${allUsers.length}`);
  console.log(`  professionals: ${byRole.professional || 0}`);
  console.log(`  customers:     ${byRole.customer || 0}`);
  console.log(`  admin:         ${byRole.admin || 0}\n`);

  // Verify all 8 KEEP_EMAILS exist before doing anything else - a typo
  // here is exactly the kind of mistake this check exists to catch.
  const byEmailLower = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));
  let anyMissing = false;

  console.log('KEEP_EMAILS check (8 expected):');
  for (const email of KEEP_EMAILS) {
    const found = byEmailLower.get(email.toLowerCase());
    if (found) {
      console.log(`  ✅ FOUND    ${email}  ->  ${found.name} | ${found.role}`);
    } else {
      console.log(`  ❌ MISSING  ${email}`);
      anyMissing = true;
    }
  }

  if (anyMissing) {
    console.error('\nOne or more KEEP_EMAILS was not found in the database. Stopping - not proceeding with');
    console.error('any delete planning or deletion. Check for a typo in KEEP_EMAILS before re-running.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('\nAll 8 KEEP_EMAILS confirmed present. Safe to proceed.\n');

  const toDelete = allUsers.filter((u) => !KEEP_SET.has(u.email.toLowerCase()));
  const toKeep = allUsers.filter((u) => KEEP_SET.has(u.email.toLowerCase()));

  console.log(`Accounts to be KEPT: ${toKeep.length}`);
  console.log(`Accounts to be DELETED: ${toDelete.length}\n`);

  console.log(`Sample of accounts to be deleted (first ${Math.min(20, toDelete.length)} of ${toDelete.length}):`);
  toDelete.slice(0, 20).forEach((u, i) => console.log(`  ${i + 1}. ${fmt(u)}`));
  if (toDelete.length > 20) console.log(`  ... and ${toDelete.length - 20} more`);

  console.log(`\nBefore: ${allUsers.length} total accounts`);
  console.log(`After:  ${toKeep.length} total accounts (the 8 KEEP_EMAILS)\n`);

  if (!CONFIRM) {
    console.log('Dry run only - nothing was deleted. Re-run with --confirm to actually delete the accounts listed above.');
    await mongoose.disconnect();
    return;
  }

  const deleteIds = toDelete.map((u) => u._id);

  console.log(`Deleting related data for ${deleteIds.length} accounts...`);
  await Promise.all([
    Booking.deleteMany({ $or: [{ customer: { $in: deleteIds } }, { professional: { $in: deleteIds } }] }),
    JobPost.deleteMany({ customer: { $in: deleteIds } }),
    Rating.deleteMany({ $or: [{ customer: { $in: deleteIds } }, { professional: { $in: deleteIds } }] }),
    ChatMessage.deleteMany({ $or: [{ sender: { $in: deleteIds } }, { recipient: { $in: deleteIds } }] }),
    Notification.deleteMany({ user: { $in: deleteIds } }),
    CreditTransaction.deleteMany({ professional: { $in: deleteIds } }),
    TopUpRequest.deleteMany({ user: { $in: deleteIds } }),
    FeaturedRequest.deleteMany({ user: { $in: deleteIds } }),
    // A job post can outlive a deleted applicant/selected professional if
    // its owning customer is one of the 8 kept - scrub the dangling
    // references from those instead of deleting the post itself.
    JobPost.updateMany(
      { 'applicants.professional': { $in: deleteIds } },
      { $pull: { applicants: { professional: { $in: deleteIds } } } }
    ),
    JobPost.updateMany({ selectedPro: { $in: deleteIds } }, { $set: { selectedPro: null } }),
  ]);

  console.log('Deleting accounts...');
  // pushSubscription lives on the User document itself, so it's removed
  // automatically here - no separate collection to clean up.
  const result = await User.deleteMany({ _id: { $in: deleteIds } });
  console.log(`Deleted ${result.deletedCount} accounts.`);

  const remaining = await User.countDocuments();
  console.log(`\nDone. Accounts remaining: ${remaining} (expected ${toKeep.length}).`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
