const ymd = (d) => new Date(d).toISOString().slice(0, 10);

const dateAtNoonUTC = (d) => {
  const x = new Date(d);
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate(), 12, 0, 0, 0));
};

const dayBoundsUTC = (dateStr) => {
  const [Y, M, D] = dateStr.split('-').map(Number);
  return {
    start: new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0)),
    end:   new Date(Date.UTC(Y, M - 1, D, 23, 59, 59, 999))
  };
};

const getEndTime = (start, hrs) => {
  const [hour, minute] = String(start).split(':').map(Number);
  const end = new Date();
  end.setHours(hour + Number(hrs || 1), minute, 0, 0);
  return end.toTimeString().slice(0, 5);
};

const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_MAP = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

module.exports = { ymd, dateAtNoonUTC, dayBoundsUTC, getEndTime, DAYNAMES, DAYS_MAP };
