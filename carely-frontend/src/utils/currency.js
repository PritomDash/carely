export const formatBDT = (amount) => {
  if (amount == null || isNaN(amount)) return '৳0';
  return '৳' + Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 0 });
};

export const CURRENCY_SYMBOL = '৳';
