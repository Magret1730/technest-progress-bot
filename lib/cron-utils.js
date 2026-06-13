const cron = require('node-cron');

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function describeCron(expression) {
  const parsed = parseCron(expression);
  if (!parsed) {
    return expression;
  }

  const day = DAYS[parsed.dayOfWeek] || `day ${parsed.dayOfWeek}`;
  const hour12 = parsed.hour24 % 12 || 12;
  const period = parsed.hour24 >= 12 ? 'PM' : 'AM';
  const minuteLabel = String(parsed.minute).padStart(2, '0');

  return `Every ${day} at ${hour12}:${minuteLabel} ${period}`;
}

function parseCron(expression) {
  const parts = String(expression ?? '').trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (dayOfMonth !== '*' || month !== '*') {
    return null;
  }

  const minuteNum = Number(minute);
  const hourNum = Number(hour);
  const dayNum = Number(dayOfWeek);

  if (
    Number.isNaN(minuteNum) ||
    Number.isNaN(hourNum) ||
    Number.isNaN(dayNum) ||
    minuteNum < 0 ||
    minuteNum > 59 ||
    hourNum < 0 ||
    hourNum > 23 ||
    dayNum < 0 ||
    dayNum > 6
  ) {
    return null;
  }

  return {
    minute: minuteNum,
    hour24: hourNum,
    dayOfWeek: dayNum,
    time: `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`,
  };
}

function buildCronFromDayAndTime(dayOfWeek, time) {
  if (dayOfWeek === '' || dayOfWeek === undefined || dayOfWeek === null) {
    throw new Error('Day of week is required for weekly schedule.');
  }

  if (!time) {
    throw new Error('Time is required for weekly schedule.');
  }

  const [hour, minute] = String(time).split(':');
  const hourNum = Number(hour);
  const minuteNum = Number(minute);
  const dayNum = Number(dayOfWeek);

  if (
    Number.isNaN(hourNum) ||
    Number.isNaN(minuteNum) ||
    Number.isNaN(dayNum) ||
    dayNum < 0 ||
    dayNum > 6
  ) {
    throw new Error('Choose a valid day and time for weekly schedule.');
  }

  return `${minuteNum} ${hourNum} * * ${dayNum}`;
}

function isValidCron(expression) {
  return cron.validate(String(expression ?? '').trim());
}

module.exports = {
  DAYS,
  describeCron,
  parseCron,
  buildCronFromDayAndTime,
  isValidCron,
};
