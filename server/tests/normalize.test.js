import { normalizeMerchant } from '../src/services/categorization/normalize.js';

describe('normalizeMerchant', () => {
  const testCases = [
    { input: 'UPI-SWIGGY*ORDER 4521', expected: 'swiggy order' },
    { input: 'NEFT TCS SALARY OCT', expected: 'tcs salary oct' },
    { input: 'POS 4X9Z TRADING CO', expected: '4x9z trading co' },
    { input: 'IMPS/REF/12345/AMAZON PAY', expected: 'amazon pay' },
    { input: 'ACH-ZERODHA BROKING', expected: 'zerodha broking' },
    { input: 'TXN*UBER RIDES', expected: 'uber rides' },
    { input: 'PAYMENT TO NETFLIX', expected: 'payment netflix' },
    { input: 'TRANSFER FROM MOM', expected: 'transfer mom' },
    { input: 'AIRTEL PREPAID 9876543210', expected: 'airtel prepaid' },
    { input: 'APOLLO PHARMACY BANGALORE HYD', expected: 'apollo pharmacy bangalore' },
    { input: 'ZOMATO ONLINE ORDER 9988', expected: 'zomato online order' },
    { input: '', expected: '' },
    { input: null, expected: '' }
  ];

  testCases.forEach(({ input, expected }, idx) => {
    it(`test case #${idx + 1}: "${input}" -> "${expected}"`, () => {
      expect(normalizeMerchant(input)).toBe(expected);
    });
  });
});

