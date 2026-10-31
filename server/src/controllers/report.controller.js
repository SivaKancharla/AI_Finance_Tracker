import PDFDocument from 'pdfkit';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import {
  currentMonthKey,
  parseMonthParam,
  getMonthRange
} from '../services/analytics/dateRange.js';
import { summarizeMonth } from '../services/analytics/summary.js';

export const getMonthlyReport = async (req, res) => {
  let year;
  let month;

  if (req.query.month && req.query.month.includes('-')) {
    try {
      const parsed = parseMonthParam(req.query.month);
      year = parsed.year;
      month = parsed.month;
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  } else if (req.query.year && req.query.month) {
    year = parseInt(req.query.year, 10);
    month = parseInt(req.query.month, 10);
  } else {
    const cur = parseMonthParam(currentMonthKey());
    year = cur.year;
    month = cur.month;
  }

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      message: 'Invalid year or month specified.'
    });
  }

  const periodStr = `${year}-${String(month).padStart(2, '0')}`;
  const range = getMonthRange(year, month);

  const [transactions, budget] = await Promise.all([
    Transaction.find({
      userId: req.userId,
      transactionDate: { $gte: range.start, $lt: range.end }
    })
      .sort({ transactionDate: -1, _id: -1 })
      .lean(),
    Budget.findOne({ userId: req.userId }).lean()
  ]);

  const summary = summarizeMonth(transactions, budget);

  const format = (req.query.format || 'json').toLowerCase();

  if (format !== 'pdf') {
    return res.status(200).json({
      success: true,
      data: {
        period: periodStr,
        summary,
        transactions
      }
    });
  }

  // Generate PDF via PDFKit
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=finance-report-${periodStr}.pdf`
  );

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  // PDF Header
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('FinTrack — Monthly Financial Report', { align: 'left' });
  doc
    .fontSize(11)
    .font('Helvetica')
    .text(`Period: ${periodStr}`, { align: 'left' });
  doc.text(`Generated on: ${new Date().toISOString().slice(0, 10)}`, { align: 'left' });
  doc.moveDown(1.5);

  // Financial Summary Section
  doc.fontSize(14).font('Helvetica-Bold').text('1. Executive Financial Summary');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');

  const currency = (val) => `INR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  doc.text(`Total Income: ${currency(summary.totalIncome)}`);
  doc.text(`Total Expenses: ${currency(summary.totalExpense)}`);
  doc.text(`Net Savings: ${currency(summary.savings)}`);
  if (summary.monthlyBudget > 0) {
    doc.text(`Monthly Budget: ${currency(summary.monthlyBudget)}`);
    doc.text(`Budget Remaining: ${currency(summary.budgetRemaining)} (${summary.budgetUsedPercent}% used)`);
  } else {
    doc.text('Monthly Budget: Not set');
  }
  doc.moveDown(1.5);

  // Category Breakdown Section
  doc.fontSize(14).font('Helvetica-Bold').text('2. Spending by Category');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');

  if (summary.categoryBreakdown.length === 0) {
    doc.text('No expense records for this month.');
  } else {
    summary.categoryBreakdown.forEach((item) => {
      doc.text(`• ${item.category}: ${currency(item.amount)} (${item.percent}%)`);
    });
  }
  doc.moveDown(1.5);

  // Transactions Section
  doc.fontSize(14).font('Helvetica-Bold').text('3. Transactions');
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica');

  const displayLimit = 40;
  const displayItems = transactions.slice(0, displayLimit);

  if (transactions.length === 0) {
    doc.text('No transactions recorded during this period.');
  } else {
    displayItems.forEach((t) => {
      const dateStr = new Date(t.transactionDate).toISOString().slice(0, 10);
      const sign = t.type === 'income' ? '+' : '-';
      doc.text(`${dateStr} | ${t.title} | ${t.category} | ${sign}${currency(t.amount)}`);
    });

    if (transactions.length > displayLimit) {
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Oblique')
        .text(`(Showing first ${displayLimit} of ${transactions.length} transactions)`);
    }
  }

  doc.end();
};

export default {
  getMonthlyReport
};

