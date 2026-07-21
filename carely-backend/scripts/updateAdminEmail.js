// One-time migration: changes the Carely admin account's email to
// carely.help@gmail.com and sets a temporary password, so the real admin
// can immediately use the normal /forgot-password flow (works for any
// role, including admin - see authRoutes.js) to set their own permanent
// password at the new inbox.
//
// SAFETY:
//   - Refuses to run without MONGODB_URI or TEMP_PASSWORD set - never
//     guesses a connection string or a password.
//   - TEMP_PASSWORD is never hardcoded here (this is a public repo) and is
//     never printed to the console.
//   - Stops if there isn't exactly one account with role 'admin' - either
//     none found, or more than one (ambiguous, refuses to guess which one).
//   - Stops if any OTHER account already uses carely.help@gmail.com,
//     rather than silently overwriting it or creating a duplicate.
//   - The plain-text password is assigned to `admin.password` and saved via
//     `.save()` so the User model's pre-save hook hashes it exactly once.
//     Hashing it manually here too would double-hash and silently break
//     login - the same bug this avoided before in resetAdmin.js.
//
// Usage (PowerShell):
//   $env:MONGODB_URI="..."; $env:TEMP_PASSWORD="some-temp-pass"; node scripts/updateAdminEmail.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

const NEW_ADMIN_EMAIL = 'carely.help@gmail.com';

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting - refusing to guess a connection string.');
    process.exit(1);
  }
  if (!process.env.TEMP_PASSWORD) {
    console.error('TEMP_PASSWORD is not set. Aborting - refusing to set a blank/guessed password.');
    process.exit(1);
  }
  if (process.env.TEMP_PASSWORD.length < 8) {
    console.error('TEMP_PASSWORD is shorter than 8 characters (the app\'s own minimum for any reset');
    console.error('password). Aborting - pick a longer temporary password.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const admins = await User.find({ role: 'admin' });
  if (admins.length === 0) {
    console.error('No account with role "admin" was found. Aborting - nothing to update.');
    await mongoose.disconnect();
    process.exit(1);
  }
  if (admins.length > 1) {
    console.error(`Found ${admins.length} accounts with role "admin" - expected exactly one. Stopping,`);
    console.error('refusing to guess which one to update:');
    admins.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} | ${a.email} | ${a._id}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  const admin = admins[0];
  console.log(`Found admin account: ${admin.name} <${admin.email}>`);

  const newEmailLower = NEW_ADMIN_EMAIL.toLowerCase();
  if (admin.email.toLowerCase() !== newEmailLower) {
    const clash = await User.findOne({ email: newEmailLower, _id: { $ne: admin._id } });
    if (clash) {
      console.error(`Another account already uses ${NEW_ADMIN_EMAIL} (${clash.name}, role: ${clash.role}).`);
      console.error('Stopping - refusing to create a duplicate or overwrite that account.');
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  admin.email = NEW_ADMIN_EMAIL;
  admin.password = process.env.TEMP_PASSWORD;
  await admin.save();

  console.log('\nDone.');
  console.log(`New email set: ${NEW_ADMIN_EMAIL}`);
  console.log('Temporary password set (not printed here).');
  console.log('\nNext steps:');
  console.log('  1. Go to mycarely.app/login -> Forgot password');
  console.log(`  2. Enter ${NEW_ADMIN_EMAIL}`);
  console.log('  3. Use the reset link sent to that inbox to set your real permanent password');

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
