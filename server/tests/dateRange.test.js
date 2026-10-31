import {
  getMonthRange,
  parseMonthParam,
  currentMonthKey,
  lastNMonthKeys,
  getDaysInMonth
} from '../src/services/analytics/dateRange.js';

describe('Analytics dateRange.js', () => {
  describe('getMonthRange & Timezone Offset (IST +05:30)', () => {
    it('should compute exact UTC start and end dates for October 2026 in IST', () => {
      // 2026-10 in IST (+330 min)
      // Local start: 2026-10-01 00:00:00 IST -> UTC is 2026-09-30 18:30:00Z
      // Local end: 2026-11-01 00:00:00 IST -> UTC is 2026-10-31 18:30:00Z
      const range = getMonthRange(2026, 10, 330);

      expect(range.start.toISOString()).toBe('2026-09-30T18:30:00.000Z');
      expect(range.end.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    });

    it('should correctly include a transaction at 23:30 IST on the last day of the month', () => {
      const range = getMonthRange(2026, 10, 330);

      // 2026-10-31 23:30:00 IST is 2026-10-31 18:00:00 UTC
      const txnDate = new Date('2026-10-31T18:00:00.000Z');

      expect(txnDate >= range.start).toBe(true);
      expect(txnDate < range.end).toBe(true);
    });

    it('should exclude a transaction occurring at 00:01 IST on the 1st of the next month', () => {
      const range = getMonthRange(2026, 10, 330);

      // 2026-11-01 00:01:00 IST is 2026-10-31 18:31:00 UTC
      const txnNextMonth = new Date('2026-10-31T18:31:00.000Z');

      expect(txnNextMonth < range.end).toBe(false);
    });

    it('should handle leap years correctly in February', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29); // 2024 is leap year
      expect(getDaysInMonth(2025, 2)).toBe(28); // 2025 is non-leap year

      const leapRange = getMonthRange(2024, 2, 330);
      // Feb 2024 ends 2024-03-01 00:00 IST -> 2024-02-29 18:30:00 UTC
      expect(leapRange.end.toISOString()).toBe('2024-02-29T18:30:00.000Z');

      const nonLeapRange = getMonthRange(2025, 2, 330);
      // Feb 2025 ends 2025-03-01 00:00 IST -> 2025-02-28 18:30:00 UTC
      expect(nonLeapRange.end.toISOString()).toBe('2025-02-28T18:30:00.000Z');
    });
  });

  describe('parseMonthParam', () => {
    it('should parse valid YYYY-MM correctly', () => {
      expect(parseMonthParam('2026-10')).toEqual({ year: 2026, month: 10 });
      expect(parseMonthParam('2025-01')).toEqual({ year: 2025, month: 1 });
    });

    it('should reject invalid formats', () => {
      expect(() => parseMonthParam('2026-13')).toThrow(/invalid/i);
      expect(() => parseMonthParam('2026-0')).toThrow(/invalid/i);
      expect(() => parseMonthParam('October 2026')).toThrow(/invalid/i);
      expect(() => parseMonthParam('')).toThrow(/required/i);
    });
  });

  describe('lastNMonthKeys', () => {
    it('should generate N chronological month keys rolling over year boundaries', () => {
      const keys = lastNMonthKeys(6, '2026-03');
      expect(keys).toEqual([
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03'
      ]);
    });
  });

  describe('currentMonthKey', () => {
    it('should compute the correct month key in IST', () => {
      // 2026-09-30 20:00:00 UTC is 2026-10-01 01:30:00 IST
      const date = new Date('2026-09-30T20:00:00.000Z');
      expect(currentMonthKey(date, 330)).toBe('2026-10');
    });
  });
});

