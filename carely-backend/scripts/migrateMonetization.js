// One-time migration for the "free forever + optional Boost/Emergency
// credits" monetization model (see MONETIZATION.md at the repo root for
// the full design). This script ONLY touches the singleton Settings
// document - it deliberately does not import the User model at all, so
// there is no way it can accidentally modify any user's existing credit
// balance. Existing professionals keep whatever credits they already had
// (now simply unspendable); existing customers keep whatever credits
// they already had (still spendable on Emergency posts as before).
//
// Usage: MONGODB_URI=<production connection string> node scripts/migrateMonetization.js
require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const NEW_VALUES = {
  bookingAcceptCreditCost: 0,
  jobSelectCreditCost: 0,
  emergencyPostCreditCost: 3,
  customerFreeCredits: 10,
  freeCreditsAmount: 0,
  freeCreditsEnabled: true,
  featuredPacks: [
    { tier: 'basic',   days: 7,  priceBDT: 150, label: '7 Days Boost' },
    { tier: 'premium', days: 30, priceBDT: 500, label: '30 Days Boost' },
  ],
  creditPacks: [
    { credits: 15, priceBDT: 200, label: '15 Credits', popular: false },
    { credits: 40, priceBDT: 500, label: '40 Credits', popular: true },
  ],
  boostNotificationDelayMinutes: 15,
};

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);

  let settings = await Settings.findOne();
  if (!settings) {
    console.log('No Settings document found - creating one with the new defaults.');
    settings = await Settings.create(NEW_VALUES);
    console.log('✅ Settings created:', JSON.stringify(NEW_VALUES, null, 2));
    await mongoose.disconnect();
    return;
  }

  console.log('=== Monetization migration ===');
  const changes = [];
  for (const [key, newValue] of Object.entries(NEW_VALUES)) {
    const oldValue = settings[key];
    const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
    changes.push({ key, oldValue, newValue, changed });
    settings[key] = newValue;
  }
  await settings.save();

  console.log('\nField-by-field summary:');
  for (const c of changes) {
    const marker = c.changed ? 'CHANGED' : 'unchanged';
    console.log(`  [${marker}] ${c.key}: ${JSON.stringify(c.oldValue)} -> ${JSON.stringify(c.newValue)}`);
  }

  console.log('\nNo User documents were read or modified by this script - every');
  console.log('existing professional and customer keeps their current credit balance exactly as-is.');
  console.log('\n✅ Migration complete.');

  await mongoose.disconnect();
}

migrate().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
