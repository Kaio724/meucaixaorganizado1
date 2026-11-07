import type { Transaction } from '../types';
import { buildRecurringRevenueTransactions, buildRecurringExpenseTransactions } from './revenueRecurrence';

export function buildMonthlyForecasts(base: Omit<Transaction, 'id'>, endDate: string, firstIsPending = true): Array<Omit<Transaction, 'id'>> {
  const startDate = base.dueDate || base.date;
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(startDate) || !validDate(endDate)) throw new Error('Informe as datas de início e término da repetição.');
  if (endDate < startDate) throw new Error('O término da repetição deve ser igual ou posterior ao primeiro vencimento.');
  if (!Number.isFinite(base.amount) || base.amount <= 0) throw new Error('Informe um valor maior que zero.');
  if (!base.title.trim()) throw new Error('Informe a descrição do lançamento.');
  const config = {
    title: base.title, amount: base.amount, category: base.category,
    paymentMethod: base.paymentMethod, description: base.description,
    account: base.account, accountType: base.accountType,
    frequency: 'mensal' as const, day: Number(startDate.slice(-2)),
    startDate, endDate, maxOccurrences: 121,
  };
  const series = base.type === 'entrada' ? buildRecurringRevenueTransactions(config) : buildRecurringExpenseTransactions(config);
  if (series.length > 120) throw new Error('Escolha um período de até 120 parcelas mensais.');
  return series.map((item, index) => index === 0 && !firstIsPending
    ? { ...item, status: 'realizado', effectiveDate: startDate, amountPaid: base.amount }
    : item);
}
