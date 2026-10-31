import { parseTransactionDate } from '../src/services/import/dateParse.js';

describe('parseTransactionDate', () => {
  it('should parse YYYY-MM-DD format correctly', () => {
    const res = parseTransactionDate('2026-10-15');
    expect(res).not.toBeNull();
    expect(res.dateStr).toBe('2026-10-15');
    expect(res.date instanceof Date).toBe(true);
  });

  it('should parse DD/MM/YYYY and DD-MM-YYYY format correctly', () => {
    const slash = parseTransactionDate('15/10/2026');
    expect(slash).not.toBeNull();
    expect(slash.dateStr).toBe('2026-10-15');

    const dash = parseTransactionDate('05-03-2026');
    expect(dash).not.toBeNull();
    expect(dash.dateStr).toBe('2026-03-05');
  });

  it('should parse text month formats with 4-digit and 2-digit years', () => {
    const textYear4 = parseTransactionDate('15 Oct 2026');
    expect(textYear4).not.toBeNull();
    expect(textYear4.dateStr).toBe('2026-10-15');

    const textYear2 = parseTransactionDate('15-Oct-26');
    expect(textYear2).not.toBeNull();
    expect(textYear2.dateStr).toBe('2026-10-15');

    const textDash = parseTransactionDate('01-Jan-2026');
    expect(textDash).not.toBeNull();
    expect(textDash.dateStr).toBe('2026-01-01');
  });

  it('should reject impossible dates (31 Feb, non-existent days)', () => {
    expect(parseTransactionDate('31/02/2026')).toBeNull();
    expect(parseTransactionDate('30/02/2026')).toBeNull();
    expect(parseTransactionDate('31/04/2026')).toBeNull(); // April has 30 days
    expect(parseTransactionDate('32/01/2026')).toBeNull();
  });

  it('should correctly handle leap years', () => {
    // 2024 was leap year
    const leap2024 = parseTransactionDate('29/02/2024');
    expect(leap2024).not.toBeNull();
    expect(leap2024.dateStr).toBe('2024-02-29');

    // 2025 was NOT leap year
    const nonLeap2025 = parseTransactionDate('29/02/2025');
    expect(nonLeap2025).toBeNull();
  });

  it('should return null for malformed or empty inputs', () => {
    expect(parseTransactionDate('')).toBeNull();
    expect(parseTransactionDate(null)).toBeNull();
    expect(parseTransactionDate(undefined)).toBeNull();
    expect(parseTransactionDate('invalid-date')).toBeNull();
    expect(parseTransactionDate('12345')).toBeNull();
  });
});

