/**
 * Indian Rupee and Date formatting utilities.
 */

/**
 * Format a number as Indian Currency (INR).
 * Uses en-IN grouping (e.g. ₹1,50,000 or ₹1,50,000.50).
 * 
 * @param {number|string} amount 
 * @param {boolean} showDecimals Whether to include 2 decimal places
 * @returns {string} e.g. "₹45,000" or "₹45,000.00"
 */
export function formatCurrency(amount, showDecimals = false) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(num);
}

/**
 * Format an ISO date string or Date object into "DD MMM YYYY".
 * e.g. "15 Oct 2026"
 * 
 * @param {string|Date} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(d);
}

/**
 * Returns month label for a 'YYYY-MM' key.
 * e.g. "2026-10" -> "October 2026"
 * 
 * @param {string} monthKey 
 * @returns {string}
 */
export function formatMonthName(monthKey) {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(d);
}

export default {
  formatCurrency,
  formatDate,
  formatMonthName
};
