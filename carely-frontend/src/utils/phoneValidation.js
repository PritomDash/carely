// Bangladeshi mobile numbers: 11 digits, starting 01, second digit 3-9
// (013/014/015/016/017/018/019 - the current operator prefix ranges;
// 010/011/012 aren't allocated). Same rule used client and server side.
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

export const isValidBDPhone = (phone) => BD_PHONE_RE.test(String(phone || '').trim());

export const BD_PHONE_ERROR = 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)';
