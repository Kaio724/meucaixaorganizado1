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
  endDate: string; // YYYY-MM-DD (Obrigatória para novas recorrências)
  maxOccurrences?: number;
}

/**
 * Computes scheduled dates for a recurring revenue or expense.
 * Each occurrence has its own distinct local reference date.
 * Strictly respects endDateStr and does not generate occurrences after it.
 */
export function generateRevenueDates(
  startDateStr: string,
  frequency: RecurrenceFrequency,
  day: number,
  endDateStr?: string,
  maxOccurrences = 120
): string[] {
  const dates: string[] = [];
  if (!startDateStr) return dates;

  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);

  if (frequency === 'mensal') {
    let yr = startYear;
    let mo = startMonth; // 1-12
    let count = 0;
    const limit = maxOccurrences || 120;

    while (count < limit) {
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const validDay = Math.min(Math.max(1, day), daysInMonth);
      let dateStr = `${yr}-${String(mo).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;

      // In the first month, if the chosen day is before startDate,
      // clamp to startDateStr so the first month is accounted for on its start date
      if (yr === startYear && mo === startMonth && dateStr < startDateStr) {
        dateStr = startDateStr;
      }

      // If the generated date surpasses the mandatory end date, stop immediately
      if (endDateStr && dateStr > endDateStr) {
        break;
      }

      dates.push(dateStr);
      count++;

      // Check if we reached the final month/year defined by endDateStr
      if (endDateStr) {
        const [endY, endM] = endDateStr.split('-').map(Number);
        if (yr > endY || (yr === endY && mo >= endM)) {
          break;
        }
      }

      // Advance one month
      mo += 1;
      if (mo > 12) {
        mo = 1;
        yr += 1;
      }
    }
  } else if (frequency === 'semanal') {
    const current = new Date(startDateStr + 'T12:00:00');
    let count = 0;
    const limit = maxOccurrences || 120;
    while (count < limit) {
      const yr = current.getFullYear();
      const mo = String(current.getMonth() + 1).padStart(2, '0');
      const da = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${da}`;

      if (endDateStr && dateStr > endDateStr) break;
      dates.push(dateStr);
      count++;
      current.setDate(current.getDate() + 7);
    }
  } else if (frequency === 'quinzenal') {
    const current = new Date(startDateStr + 'T12:00:00');
    let count = 0;
    const limit = maxOccurrences || 120;
    while (count < limit) {
      const yr = current.getFullYear();
      const mo = String(current.getMonth() + 1).padStart(2, '0');
      const da = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${da}`;

      if (endDateStr && dateStr > endDateStr) break;
      dates.push(dateStr);
      count++;
      current.setDate(current.getDate() + 15);
    }
  } else if (frequency === 'anual') {
    const current = new Date(startDateStr + 'T12:00:00');
    let count = 0;
    const limit = Math.min(20, maxOccurrences || 20);
    while (count < limit) {
      const yr = current.getFullYear();
      const mo = String(current.getMonth() + 1).padStart(2, '0');
      const da = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${da}`;

      if (endDateStr && dateStr > endDateStr) break;
      dates.push(dateStr);
      count++;
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
    config.maxOccurrences || 120
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

export interface RecurringExpenseConfig {
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
  endDate: string; // YYYY-MM-DD (Obrigatória para novas recorrências)
  maxOccurrences?: number;
  contaId?: string;
}

/**
 * Creates full transaction objects for a recurring fixed expense (despesa fixa recorrente).
 * Preserves expenseType: 'fixa' across all generated occurrences.
 */
export function buildRecurringExpenseTransactions(
  config: RecurringExpenseConfig
): Array<Omit<Transaction, 'id'>> {
  const recurrenceId = 'rec_exp_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  const dates = generateRevenueDates(
    config.startDate,
    config.frequency,
    config.day,
    config.endDate,
    config.maxOccurrences || 120
  );

  return dates.map((dateStr) => ({
    title: config.title.trim(),
    amount: config.amount,
    type: 'saida' as const,
    expenseType: 'fixa' as const, // PRESERVES FIXA ACROSS ALL OCCURRENCES
    category: config.category,
    paymentMethod: config.paymentMethod || 'Boleto',
    date: dateStr,
    description: config.description || undefined,
    account: config.account || undefined,
    accountType: config.accountType || 'empresarial',
    recurrenceId,
    recurrenceFrequency: config.frequency,
    recurrenceDay: config.day,
    recurrenceStartDate: config.startDate,
    recurrenceEndDate: config.endDate || undefined,
    contaId: config.contaId || undefined
  }));
}
