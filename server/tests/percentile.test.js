import { calculatePercentile } from '../src/controllers/ai.controller.js';

describe('Percentile Helper (calculatePercentile)', () => {
  it('should return 0 for empty or invalid arrays', () => {
    expect(calculatePercentile([])).toBe(0);
    expect(calculatePercentile(null)).toBe(0);
    expect(calculatePercentile(undefined)).toBe(0);
  });

  it('should calculate 95th percentile correctly for odd-length arrays', () => {
    // 10 items: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
    const latencies = [50, 20, 90, 10, 40, 80, 100, 30, 70, 60];
    // p95 of 10 items: ceil(0.95 * 10) - 1 = 10 - 1 = index 9 -> 100
    expect(calculatePercentile(latencies, 0.95)).toBe(100);
    // p50 (median) of 10 items: ceil(0.5 * 10) - 1 = 5 - 1 = index 4 -> 50
    expect(calculatePercentile(latencies, 0.5)).toBe(50);
  });

  it('should calculate 95th percentile accurately for single element', () => {
    expect(calculatePercentile([250], 0.95)).toBe(250);
  });
});
