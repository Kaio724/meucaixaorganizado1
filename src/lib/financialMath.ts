import { Transaction, TransactionStatus } from '../types';

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely resolves transaction status, guaranteeing full backwards compatibility:
 * - If status is explicitly defined, honors it.
 * - If status is undefined:
 *   - Recurring future occurrences default to 'pendente'
 *   - Legacy transactions on or before today default to 'realizado' so historical balances are never broken.
 */
export function resolveTransactionStatus(tx: Transaction): TransactionStatus {
  if (tx.status) {
    return tx.status;
  }
  const today = getTodayDateStr();
  const refDate = tx.dueDate || tx.date;
  if (refDate && refDate > today && (tx.recurrenceId || tx.contaId)) {
    return 'pendente';
  }
  return 'realizado';
}

export function isTransactionRealized(tx: Transaction): boolean {
  return resolveTransactionStatus(tx) === 'realizado';
}

export function isTransactionPending(tx: Transaction): boolean {
  return resolveTransactionStatus(tx) === 'pendente';
}

export type DueAlertStatus = 'recebido' | 'pago' | 'vence_hoje' | 'a_vencer' | 'atrasado' | 'cancelado';

/**
 * Computes the temporal due/delay status of a transaction relative to today's local date.
 */
export function getTransactionDueStatus(tx: Transaction, todayStr = getTodayDateStr()): DueAlertStatus {
  const status = resolveTransactionStatus(tx);

  if (status === 'cancelado') {
    return 'cancelado';
  }

  if (status === 'realizado') {
    return tx.type === 'entrada' ? 'recebido' : 'pago';
  }

  const dueDate = tx.dueDate || tx.date || todayStr;

  if (dueDate < todayStr) {
    return 'atrasado';
  }
  if (dueDate === todayStr) {
    return 'vence_hoje';
  }
  return 'a_vencer';
}

export interface FinancialMetrics {
  // Realized cash (Dinheiro real no caixa)
  entradasRealizadas: number;
  saidasRealizadas: number;
  saldoRealizado: number;

  // Projected (Previsões e pendências do mês)
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoPrevisto: number;

  // Overdue (Em atraso geral ou do período)
  receitasEmAtraso: number;
  despesasEmAtraso: number;
  qtdReceitasEmAtraso: number;
  qtdDespesasEmAtraso: number;

  // Breakdown by fixed / variable
  receitasFixasRealizadas: number;
  receitasVariaveisRealizadas: number;
  despesasFixasRealizadas: number;
  despesasVariaveisRealizadas: number;

  // Totals for reconciliation
  totalMovimentacoes: number;
  pendentesCount: number;
  realizadasCount: number;
}

/**
 * Computes centralized monthly financial metrics for a specific month and year.
 * Realized values strictly use the effective movement date (or date if not set).
 * Projected values use the scheduled dueDate (or date).
 */
export function calculateMonthlyFinancialMetrics(
  transactions: Transaction[],
  year: number,
  monthIndex: number
): FinancialMetrics {
  const todayStr = getTodayDateStr();

  let entradasRealizadas = 0;
  let saidasRealizadas = 0;
  let entradasPrevistas = 0;
  let saidasPrevistas = 0;

  let receitasFixasRealizadas = 0;
  let receitasVariaveisRealizadas = 0;
  let despesasFixasRealizadas = 0;
  let despesasVariaveisRealizadas = 0;

  let receitasEmAtraso = 0;
  let despesasEmAtraso = 0;
  let qtdReceitasEmAtraso = 0;
  let qtdDespesasEmAtraso = 0;

  let pendentesCount = 0;
  let realizadasCount = 0;

  for (const tx of transactions) {
    const status = resolveTransactionStatus(tx);
    if (status === 'cancelado') continue;

    const isRealized = status === 'realizado';
    const isPending = status === 'pendente';

    // Competence / matching date
    // Realized matches on effectiveDate || date
    // Pending matches on dueDate || date
    const dateToCheck = isRealized ? (tx.effectiveDate || tx.date) : (tx.dueDate || tx.date);
    if (!dateToCheck) continue;

    const [tY, tM] = dateToCheck.split('-').map(Number);
    const isInSelectedMonth = tY === year && tM === monthIndex + 1;

    // Check overdue across all pending transactions up to today, or for this month
    if (isPending) {
      const dueDate = tx.dueDate || tx.date || todayStr;
      if (dueDate < todayStr) {
        if (tx.type === 'entrada') {
          receitasEmAtraso += tx.amount;
          qtdReceitasEmAtraso += 1;
        } else {
          despesasEmAtraso += tx.amount;
          qtdDespesasEmAtraso += 1;
        }
      }
    }

    if (!isInSelectedMonth) continue;

    if (isRealized) {
      realizadasCount++;
      const val = tx.amountPaid !== undefined ? tx.amountPaid : tx.amount;
      if (tx.type === 'entrada') {
        entradasRealizadas += val;
        if (tx.revenueType === 'fixa') {
          receitasFixasRealizadas += val;
        } else {
          receitasVariaveisRealizadas += val;
        }
      } else {
        saidasRealizadas += val;
        if (tx.expenseType === 'fixa') {
          despesasFixasRealizadas += val;
        } else {
          despesasVariaveisRealizadas += val;
        }
      }
    } else if (isPending) {
      pendentesCount++;
      const val = tx.amount;
      if (tx.type === 'entrada') {
        entradasPrevistas += val;
      } else {
        saidasPrevistas += val;
      }
    }
  }

  const saldoRealizado = entradasRealizadas - saidasRealizadas;
  const saldoPrevisto = saldoRealizado + entradasPrevistas - saidasPrevistas;

  return {
    entradasRealizadas,
    saidasRealizadas,
    saldoRealizado,
    entradasPrevistas,
    saidasPrevistas,
    saldoPrevisto,
    receitasEmAtraso,
    despesasEmAtraso,
    qtdReceitasEmAtraso,
    qtdDespesasEmAtraso,
    receitasFixasRealizadas,
    receitasVariaveisRealizadas,
    despesasFixasRealizadas,
    despesasVariaveisRealizadas,
    totalMovimentacoes: realizadasCount + pendentesCount,
    pendentesCount,
    realizadasCount,
  };
}

/**
 * Returns a new transaction marked as settled (baixa confirmada).
 */
export function settleTransaction(
  tx: Transaction,
  amountPaid?: number,
  effectiveDate?: string,
  observation?: string
): Transaction {
  const actualDate = effectiveDate || getTodayDateStr();
  const actualAmount = amountPaid !== undefined && !isNaN(amountPaid) ? amountPaid : tx.amount;

  return {
    ...tx,
    status: 'realizado',
    dueDate: tx.dueDate || tx.date, // Preserves original due date
    effectiveDate: actualDate,
    amountPaid: actualAmount,
    observation: observation !== undefined ? observation : tx.observation,
  };
}

/**
 * Reverts a settled transaction back to pending state safely.
 */
export function unsettleTransaction(tx: Transaction): Transaction {
  return {
    ...tx,
    status: 'pendente',
    dueDate: tx.dueDate || tx.date,
    effectiveDate: undefined,
    amountPaid: undefined,
  };
}
