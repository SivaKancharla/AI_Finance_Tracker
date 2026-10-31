import { DEFAULT_TZ_OFFSET_MINUTES, getDaysInMonth } from '../analytics/dateRange.js';

const MONTH_NAMES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Parses a variety of date formats commonly found in Indian bank CSV exports.
 * 
 * Supported formats:
 * - DD/MM/YYYY, DD-MM-YYYY
 * - YYYY-MM-DD, YYYY/MM/DD
 * - DD MMM YYYY, DD-MMM-YYYY (e.g. 15 Oct 2026, 15-Oct-2026)
 * - DD MMM YY, DD-MMM-YY (e.g. 15 Oct 26, 15-Oct-26)
 * 
 * Rules:
 * - Never uses new Date(str) directly.
 * - Enforces calendar validity (e.g. rejects 31 Feb, leap-year aware).
 * - Anchors to IST midnight (00:00:00 local time).
 * 
 * @param {string} dateStr 
 * @returns {{ date: Date, dateStr: string } | null}
 */
export function parseTransactionDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const raw = dateStr.trim();
  if (!raw) return null;

  let year, month, day;

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  }

  // Pattern 2: DD-MM-YYYY or DD/MM/YYYY
  if (!year) {
    const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      year = parseInt(dmyMatch[3], 10);
    }
  }

  // Pattern 3: DD MMM YYYY or DD-MMM-YYYY or DD MMM YY or DD-MMM-YY (e.g., 15 Oct 2026, 15-Oct-26)
  if (!year) {
    const textMonthMatch = raw.match(/^(\d{1,2})[\s/-]+([A-Za-z]+)[\s/-]+(\d{2,4})$/);
    if (textMonthMatch) {
      day = parseInt(textMonthMatch[1], 10);
      const monthToken = textMonthMatch[2].toLowerCase();
      month = MONTH_NAMES[monthToken];
      let rawYear = parseInt(textMonthMatch[3], 10);
      if (rawYear < 100) {
        rawYear += 2000;
      }
      year = rawYear;
    }
  }

  // If no pattern matched or month is invalid
  if (!year || !month || !day || month < 1 || month > 12) {
    return null;
  }

  // Validate day against actual days in that month (leap-year aware)
  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    return null;
  }

  // Calculate IST local midnight in UTC
  const offsetMs = DEFAULT_TZ_OFFSET_MINUTES * 60 * 1000;
  const utcMidnightMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs;
  const dateObj = new Date(utcMidnightMs);

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const canonicalDateStr = `${year}-${formattedMonth}-${formattedDay}`;

  return {
    date: dateObj,
    dateStr: canonicalDateStr
  };
}

export default parseTransactionDate;

