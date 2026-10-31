import { useSearchParams } from 'react-router-dom';
import { formatMonthName } from '../utils/format.js';

export function getCurrentMonthKey() {
  const now = new Date();
  // Adjust to IST (+05:30)
  const istOffsetMs = 330 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffsetMs);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function useMonthParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentKey = getCurrentMonthKey();
  const monthKey = searchParams.get('month') || currentKey;

  const setMonthKey = (newKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newKey) {
        next.set('month', newKey);
      } else {
        next.delete('month');
      }
      return next;
    });
  };

  const changeMonth = (delta) => {
    const [yearStr, monthStr] = monthKey.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + delta;

    while (m > 12) {
      m -= 12;
      y += 1;
    }
    while (m < 1) {
      m += 12;
      y -= 1;
    }

    const nextKey = `${y}-${String(m).padStart(2, '0')}`;
    setMonthKey(nextKey);
  };

  const prevMonth = () => changeMonth(-1);
  const nextMonth = () => changeMonth(1);

  return {
    monthKey,
    monthLabel: formatMonthName(monthKey),
    setMonthKey,
    prevMonth,
    nextMonth,
    isCurrentMonth: monthKey === currentKey
  };
}

export default useMonthParam;
