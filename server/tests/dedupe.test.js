import { computeDedupeHash, assignDedupeHashes } from '../src/services/import/dedupe.js';

describe('Deduplication Hash Engine (dedupe.js)', () => {
  const userId1 = '507f1f77bcf86cd799439011';
  const userId2 = '507f1f77bcf86cd799439022';

  it('should compute consistent, repeatable SHA-1 hashes', () => {
    const hash1 = computeDedupeHash({
      userId: userId1,
      dateStr: '2026-10-15',
      amount: 350,
      type: 'expense',
      title: 'Swiggy',
      occurrenceIndex: 0
    });

    const hash2 = computeDedupeHash({
      userId: userId1,
      dateStr: '2026-10-15',
      amount: 350,
      type: 'expense',
      title: 'Swiggy',
      occurrenceIndex: 0
    });

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{40}$/); // SHA-1 is 40 hex chars
  });

  it('should isolate hashes by userId for identical transaction data', () => {
    const hashUser1 = computeDedupeHash({
      userId: userId1,
      dateStr: '2026-10-15',
      amount: 500,
      type: 'expense',
      title: 'Uber',
      occurrenceIndex: 0
    });

    const hashUser2 = computeDedupeHash({
      userId: userId2,
      dateStr: '2026-10-15',
      amount: 500,
      type: 'expense',
      title: 'Uber',
      occurrenceIndex: 0
    });

    expect(hashUser1).not.toBe(hashUser2);
  });

  it('should assign distinct occurrenceIndex to identical transactions in the same batch', () => {
    const batch = [
      { dateStr: '2026-10-15', amount: 350, type: 'expense', title: 'Chai Point' },
      { dateStr: '2026-10-15', amount: 350, type: 'expense', title: 'Chai Point' },
      { dateStr: '2026-10-15', amount: 350, type: 'expense', title: 'Chai Point' }
    ];

    const hashedBatch = assignDedupeHashes(userId1, batch);

    expect(hashedBatch[0].occurrenceIndex).toBe(0);
    expect(hashedBatch[1].occurrenceIndex).toBe(1);
    expect(hashedBatch[2].occurrenceIndex).toBe(2);

    expect(hashedBatch[0].dedupeHash).not.toBe(hashedBatch[1].dedupeHash);
    expect(hashedBatch[1].dedupeHash).not.toBe(hashedBatch[2].dedupeHash);
  });

  it('should generate identical hashes on re-import of the same statement', () => {
    const originalBatch = [
      { dateStr: '2026-10-01', amount: 25000, type: 'income', title: 'Salary' },
      { dateStr: '2026-10-02', amount: 450, type: 'expense', title: 'Uber Trip' },
      { dateStr: '2026-10-02', amount: 450, type: 'expense', title: 'Uber Trip' }
    ];

    const run1 = assignDedupeHashes(userId1, originalBatch);
    const run2 = assignDedupeHashes(userId1, originalBatch);

    expect(run1[0].dedupeHash).toBe(run2[0].dedupeHash);
    expect(run1[1].dedupeHash).toBe(run2[1].dedupeHash);
    expect(run1[2].dedupeHash).toBe(run2[2].dedupeHash);
  });
});

