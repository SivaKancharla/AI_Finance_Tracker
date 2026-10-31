import { piiMask } from '../src/services/categorization/piiMask.js';

describe('piiMask.js', () => {
  it('should mask email addresses', () => {
    const input = 'Payment sent from siva.kumar@example.com for dinner';
    expect(piiMask(input)).toBe('Payment sent from [EMAIL] for dinner');
  });

  it('should mask Indian phone numbers with various formats', () => {
    expect(piiMask('Call me at 9876543210')).toBe('Call me at [PHONE]');
    expect(piiMask('UPI to +91 9876543210 successfully')).toBe('UPI to [PHONE] successfully');
    expect(piiMask('Recharge for 09876543210 completed')).toBe('Recharge for [PHONE] completed');
  });

  it('should mask Indian PAN numbers', () => {
    const input = 'KYC verified for PAN ABCDE1234F at broker';
    expect(piiMask(input)).toBe('KYC verified for PAN [PAN] at broker');
  });

  it('should mask 12-digit Aadhaar-like numbers', () => {
    expect(piiMask('UID 1234 5678 9012 linked')).toBe('UID [ID] linked');
    expect(piiMask('UID 123456789012 linked')).toBe('UID [ID] linked');
  });

  it('should mask digit runs of 9+ digits (bank account, cards, txn refs)', () => {
    expect(piiMask('Debited from A/C 1234567890123')).toBe('Debited from A/C [NUM]');
    expect(piiMask('Ref 987654321')).toBe('Ref [NUM]');
  });

  it('should preserve benign merchant names and numbers under 9 digits', () => {
    const input = 'Swiggy order 4521 for Rs 350 at 2 pm';
    expect(piiMask(input)).toBe('Swiggy order 4521 for Rs 350 at 2 pm');
  });

  it('should handle empty or null values', () => {
    expect(piiMask('')).toBe('');
    expect(piiMask(null)).toBe('');
    expect(piiMask(undefined)).toBe('');
  });
});
