const getDayType = (dateStr) => {
  const d = new Date(dateStr);
  const dow = d.getDay();
  if (dow === 6) return 'saturday';
  if (dow === 0) return 'sunday';
  return 'weekday';
};

const getAppliedRate = (dateStr, pro) => {
  const type = getDayType(dateStr);
  if (type === 'saturday' && pro.saturdayRate > 0) return pro.saturdayRate;
  if (type === 'sunday'   && pro.sundayRate > 0)   return pro.sundayRate;
  if (pro.weekdayRate > 0) return pro.weekdayRate;
  return pro.hourlyRate || 0;
};

const computeProNet = (amountBDT, commissionRatePct = 15) => {
  return Math.round(amountBDT * (1 - commissionRatePct / 100) * 100) / 100;
};

module.exports = { getDayType, getAppliedRate, computeProNet };
