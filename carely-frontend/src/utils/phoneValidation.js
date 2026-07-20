// Deliberately permissive. The old strict BD-only pattern
// (/^01[3-9]\d{8}$/) rejected real-world mobile input often enough to
// block real registrations - a nurse unable to sign up is a far bigger
// problem than a slightly-off phone number. This only strips formatting
// noise and checks the result looks roughly like a phone number at all;
// it never enforces a country-specific shape.
const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// Strips spaces, dashes, parens, Bengali numerals (common on a
// Bangla-locale keyboard), and a leading country code (+880/880) - so
// "017-1234-5678", "+8801712345678", and "০১৭১২৩৪৫৬৭৮" all normalize to
// the same digits before validating or storing.
export const normalizePhone = (raw) => {
  let s = String(raw || '').trim().replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
  s = s.replace(/[^\d+]/g, '');
  s = s.replace(/^\+?880/, '0');
  return s;
};

// "Does this look like a phone number at all?" - a digit count in a
// reasonable range, nothing more. No leading-01 requirement, no operator
// prefix check, no fixed length.
export const isValidPhone = (phone) => {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14;
};

export const PHONE_HINT = "That doesn't quite look like a phone number - please double-check it.";
