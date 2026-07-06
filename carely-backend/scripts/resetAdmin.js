require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

const ADMIN_EMAIL = 'admin@carely.com';
const ADMIN_PASSWORD = 'Admin@Carely2025';

async function resetAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Assign the PLAIN password and let User's pre-save hook hash it - the
  // model already hashes any modified `password` field on save, so hashing
  // it here too would double-hash and silently break comparePassword/login.
  let admin = await User.findOne({ email: ADMIN_EMAIL });

  if (admin) {
    admin.password = ADMIN_PASSWORD;
    admin.role = 'admin';
    admin.isVerified = true;
    await admin.save();
    console.log('✅ Admin password reset');
  } else {
    admin = await User.create({
      name: 'Carely Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      phone: '01700000000',
      role: 'admin',
      isVerified: true,
      profileApproved: true,
    });
    console.log('✅ Admin created');
  }

  console.log('Email:', ADMIN_EMAIL);
  console.log('Password:', ADMIN_PASSWORD);
  await mongoose.disconnect();
}

resetAdmin().catch((err) => { console.error(err); process.exit(1); });
