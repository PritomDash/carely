// Bangladeshi mobile numbers: 11 digits, starting 01, second digit 3-9.
// Mirrors carely-frontend/src/utils/phoneValidation.js - keep both in sync.
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// See the frontend copy of this file for why normalization exists: real
// mobile input commonly arrives as Bengali numerals, or with a "+880"/"880"
// country code and/or spaces/dashes from phone autofill - all of which are
// still a valid number, just not in the bare "01XXXXXXXXX" shape. Enforced
// here too since this is the real server-side gate, not just UI polish.
const normalizeBDPhone = (raw) => {
  let s = String(raw || '').trim().replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
  s = s.replace(/[^\d+]/g, '');
  s = s.replace(/^\+?880/, '0');
  return s;
};

const isValidBDPhone = (phone) => BD_PHONE_RE.test(normalizeBDPhone(phone));

module.exports = { isValidBDPhone, normalizeBDPhone };
