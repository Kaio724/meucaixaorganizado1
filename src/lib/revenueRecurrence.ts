import { Transaction, RecurrenceFrequency, RevenueType } from '../types';

export interface RecurringRevenueConfig {
  title: string;
  amount: number;
  category: string;
  paymentMethod: string;
  description?: string;
  account?: string;
  accountType?: 'empresarial' | 'pessoal';
  frequency: RecurrenceFrequency;
  day: number; // 1-31
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  maxOccurrences?: number;
}

/**
 * Computes scheduled dates for a recurring revenue
 */
export function generateRevenueDates(
  startDateStr: string,
  frequency: RecurrenceFrequency,
  day: number,
  endDateStr?: string,
  maxOccurrences = 12
): string[] {
  const dates: string[] = [];
  const startObj = new Date(startDateStr + 'T12:00:00');
  const endObj = endDateStr ? new Date(endDateStr + 'T23:59:59') : null;

  if (frequency === 'mensal') {
    let currentYear = startObj.getFullYear();
    let currentMonth = startObj.getMonth();

    for (let i = 0; i < maxOccurrences; i++) {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const validDay = Math.min(Math.max(1, day), daysInMonth);
      const dateObj = new Date(currentYear, currentMonth, validDay, 12, 0, 0);

      // Only include if >= startDate (or same month)
      if (dateObj >= startObj || (dateObj.getMonth() === startObj.getMonth() && dateObj.getFullYear() === startObj.getFullYear())) {
        if (endObj && dateObj > endObj) {
          break;
        }
        dates.push(dateObj.toISOString().split('T')[0]);
      }

      // Advance one month
      currentMonth += 1;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
      }
    }
  } else if (frequency === 'semanal') {
    let current = new Date(startObj);
    for (let i = 0; i < maxOccurrences; i++) {
      if (endObj && current > endObj) break;
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }
  } else if (frequency === 'quinzenal') {
    let current = new Date(startObj);
    for (let i = 0; i < maxOccurrences; i++) {
      if (endObj && current > endObj) break;
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 15);
    }
  } else if (frequency === 'anual') {
    let current = new Date(startObj);
    for (let i = 0; i < Math.min(5, maxOccurrences); i++) {
      if (endObj && current > endObj) break;
      dates.push(current.toISOString().split('T')[0]);
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  // Ensure at least the start date is present if empty
  if (dates.length === 0) {
    dates.push(startDateStr);
  }

  return dates;
}

/**
 * Creates full transaction objects for a recurring fixed revenue
 */
export function buildRecurringRevenueTransactions(
  config: RecurringRevenueConfig
): Array<Omit<Transaction, 'id'>> {
  const recurrenceId = 'rec_rev_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  const dates = generateRevenueDates(
    config.startDate,
    config.frequency,
    config.day,
    config.endDate,
    config.maxOccurrences || 12
  );

  return dates.map((dateStr) => ({
    title: config.title.trim(),
    amount: config.amount,
    type: 'entrada' as const,
    revenueType: 'fixa' as const,
    category: config.category,
    paymentMethod: config.paymentMethod || 'Pix',
    date: dateStr,
    description: config.description || undefined,
    account: config.account || undefined,
    accountType: config.accountType || 'empresarial',
    recurrenceId,
    recurrenceFrequency: config.frequency,
    recurrenceDay: config.day,
    recurrenceStartDate: config.startDate,
    recurrenceEndDate: config.endDate || undefined
  }));
}
