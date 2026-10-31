export const DEFAULT_TZ_OFFSET_MINUTES = 330; // IST: UTC+05:30

/**
 * Returns the number of days in a given month.
 * @param {number} year 
 * @param {number} month 1-indexed (1 = Jan, 12 = Dec)
 */
export function getDaysInMonth(year, month) {
  // Using day 0 of the next month in UTC returns the last day of the target month
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Returns UTC Date objects for the start and end of a calendar month in the given timezone.
 * Start is inclusive, end is exclusive.
 * 
 * @param {number} year e.g. 2026
 * @param {number} month 1-indexed (1 to 12)
 * @param {number} tzOffsetMinutes Minutes ahead of UTC (default 330 for IST)
 * @returns {{ start: Date, end: Date }}
 */
export function getMonthRange(year, month, tzOffsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Invalid year or month: year=${year}, month=${month}`);
  }

  const offsetMs = tzOffsetMinutes * 60 * 1000;

  // Local start of month: Year-(Month)-01 00:00:00.000 local time
  // In UTC milliseconds: Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - offsetMs
  const startUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - offsetMs;

  // Local end of month (exclusive): Year-(Month + 1)-01 00:00:00.000 local time
  const endUtcMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - offsetMs;

  return {
    start: new Date(startUtcMs),
    end: new Date(endUtcMs)
  };
}

/**
 * Parses a 'YYYY-MM' string into { year, month }.
 * @param {string} param 
 * @returns {{ year: number, month: number }}
 */
export function parseMonthParam(param) {
  if (!param || typeof param !== 'string') {
    throw new Error('Month parameter is required');
  }

  const match = param.trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) {
    throw new Error(`Invalid month format '${param}'. Expected YYYY-MM.`);
  }

  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10)
  };
}

/**
 * Returns the 'YYYY-MM' key for a given Date in the specified timezone.
 * @param {Date} now 
 * @param {number} tzOffsetMinutes 
 * @returns {string} e.g. '2026-10'
 */
export function currentMonthKey(now = new Date(), tzOffsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
  const localTime = new Date(now.getTime() + tzOffsetMinutes * 60 * 1000);
  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns an array of the last N month keys ending with fromMonthKey in chronological order.
 * @param {number} n e.g. 6
 * @param {string} fromMonthKey e.g. '2026-10'
 * @returns {string[]} e.g. ['2026-05', '2026-06', ..., '2026-10']
 */
export function lastNMonthKeys(n = 6, fromMonthKey = currentMonthKey()) {
  const { year, month } = parseMonthParam(fromMonthKey);
  const keys = [];

  for (let i = n - 1; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
  }

  return keys;
}

export default {
  DEFAULT_TZ_OFFSET_MINUTES,
  getDaysInMonth,
  getMonthRange,
  parseMonthParam,
  currentMonthKey,
  lastNMonthKeys
};

