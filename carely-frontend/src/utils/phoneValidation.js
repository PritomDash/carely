// Bangladeshi mobile numbers: 11 digits, starting 01, second digit 3-9
// (013/014/015/016/017/018/019 - the current operator prefix ranges;
// 010/011/012 aren't allocated). Same rule used client and server side.
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// Real mobile input never looks like a cleanly-typed desktop string. Found
// while root-causing "registration fails on mobile" (2026-07-19): a phone
// with a Bangla keyboard/locale produces Bengali numerals for the numeric
// row, and a phone's own tel-autofill/QuickType suggestion inserts the
// number with a "+880"/"880" country code and/or spaces or dashes - none of
// which a desktop user typing manually ever hits. Normalizing before
// validating (and before storing) means all of those still count as the
// same valid number instead of being rejected as "invalid".
export const normalizeBDPhone = (raw) => {
  let s = String(raw || '').trim().replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
  s = s.replace(/[^\d+]/g, '');
  s = s.replace(/^\+?880/, '0');
  return s;
};

export const isValidBDPhone = (phone) => BD_PHONE_RE.test(normalizeBDPhone(phone));

export const BD_PHONE_ERROR = 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)';
