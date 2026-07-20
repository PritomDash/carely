// Deliberately permissive. Mirrors carely-frontend/src/utils/phoneValidation.js
// - keep both in sync. The old strict BD-only pattern (/^01[3-9]\d{8}$/)
// rejected real-world mobile input often enough to block real
// registrations - a nurse unable to sign up is a far bigger problem than a
// slightly-off phone number. This only strips formatting noise and checks
// the result looks roughly like a phone number at all; it never enforces a
// country-specific shape.
const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

const normalizePhone = (raw) => {
  let s = String(raw || '').trim().replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
  s = s.replace(/[^\d+]/g, '');
  s = s.replace(/^\+?880/, '0');
  return s;
};

const isValidPhone = (phone) => {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14;
};

module.exports = { isValidPhone, normalizePhone };
