// Bangladeshi mobile numbers: 11 digits, starting 01, second digit 3-9.
// Mirrors carely-frontend/src/utils/phoneValidation.js - keep both in sync.
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

const isValidBDPhone = (phone) => BD_PHONE_RE.test(String(phone || '').trim());

module.exports = { isValidBDPhone };
