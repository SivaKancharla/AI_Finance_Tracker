import { cleanAmount, parseCsv } from '../src/services/import/csvParser.js';

describe('CSV Parser (csvParser.js)', () => {
  describe('cleanAmount', () => {
    it('should strip currency symbols, commas, and prefixes', () => {
      expect(cleanAmount('₹ 1,500.50')).toBe(1500.50);
      expect(cleanAmount('Rs. 450')).toBe(450);
      expect(cleanAmount('INR 25,000')).toBe(25000);
      expect(cleanAmount('-350.00')).toBe(-350.00);
      expect(cleanAmount(1200)).toBe(1200);
    });

    it('should return null for invalid or non-numeric strings', () => {
      expect(cleanAmount('')).toBeNull();
      expect(cleanAmount('N/A')).toBeNull();
      expect(cleanAmount(null)).toBeNull();
    });
  });

  describe('parseCsv', () => {
    it('should parse standard 3-column statement (Date, Description, Amount)', () => {
      const csv = `Date,Description,Amount
15/10/2026,Swiggy Bangalore,-350.00
16/10/2026,Salary Oct,75000.00
17/10/2026,Uber India,450.00`;

      const res = parseCsv(csv);
      expect(res.totalRows).toBe(3);
      expect(res.validRows.length).toBe(3);
      expect(res.invalidRows.length).toBe(0);

      expect(res.validRows[0].title).toBe('Swiggy Bangalore');
      expect(res.validRows[0].amount).toBe(350);
      expect(res.validRows[0].type).toBe('expense'); // Negative amount -> expense
      expect(res.validRows[0].dateStr).toBe('2026-10-15');

      expect(res.validRows[1].title).toBe('Salary Oct');
      expect(res.validRows[1].amount).toBe(75000);
      expect(res.validRows[1].type).toBe('expense'); // Wait, positive with no type column defaults to expense unless type column or credit
    });

    it('should parse statements with separate Debit and Credit columns (HDFC style)', () => {
      const csv = `Txn Date,Narration,Withdrawal,Deposit
2026-10-01,ACH SALARY,,80000.00
2026-10-02,UPI-SWIGGY-1234,420.00,
2026-10-03,NETFLIX MUMBAI,649.00,`;

      const res = parseCsv(csv);
      expect(res.validRows.length).toBe(3);

      expect(res.validRows[0].type).toBe('income');
      expect(res.validRows[0].amount).toBe(80000);

      expect(res.validRows[1].type).toBe('expense');
      expect(res.validRows[1].amount).toBe(420);
    });

    it('should preserve valid CSV-provided categories as source: "import"', () => {
      const csv = `Date,Description,Amount,Type,Category
2026-10-10,Amazon India,1200,expense,Shopping
2026-10-11,Freelance Payment,15000,income,Salary
2026-10-12,Mystery Merchant,500,expense,NonExistentCategory`;

      const res = parseCsv(csv);
      expect(res.validRows.length).toBe(3);

      expect(res.validRows[0].category).toBe('Shopping');
      expect(res.validRows[0].source).toBe('import');
      expect(res.validRows[0].confidence).toBe(1.0);

      expect(res.validRows[1].category).toBe('Salary');
      expect(res.validRows[1].source).toBe('import');

      // Invalid category ignored so pipeline will categorize
      expect(res.validRows[2].category).toBeNull();
      expect(res.validRows[2].source).toBeNull();
    });

    it('should separate valid and invalid rows with descriptive error messages', () => {
      const csv = `Date,Description,Amount
31/02/2026,Bad Date Swiggy,350
15/10/2026,,400
16/10/2026,Zero Amount,0
17/10/2026,Valid Transaction,500`;

      const res = parseCsv(csv);
      expect(res.totalRows).toBe(4);
      expect(res.validRows.length).toBe(1);
      expect(res.invalidRows.length).toBe(3);

      expect(res.invalidRows[0].rowNumber).toBe(2);
      expect(res.invalidRows[0].errors).toContain('Invalid date format: "31/02/2026"');

      expect(res.invalidRows[1].rowNumber).toBe(3);
      expect(res.invalidRows[1].errors).toContain('Missing transaction description or title');

      expect(res.invalidRows[2].rowNumber).toBe(4);
      expect(res.invalidRows[2].errors).toContain('Amount cannot be zero or invalid');

      expect(res.validRows[0].title).toBe('Valid Transaction');
      expect(res.validRows[0].rowNumber).toBe(5);
    });
  });
});
