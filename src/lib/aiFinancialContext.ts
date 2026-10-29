import { Transaction, AccountType } from '../types';
import { 
  calculateMonthlyFinancialMetrics, 
  resolveTransactionStatus, 
  getTodayDateStr,
  FinancialMetrics 
} from './financialMath';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export interface FinancialContextBriefing {
  accountType: AccountType;
  accountLabel: string;
  currentPeriod: {
    year: number;
    monthIndex: number;
    monthName: string;
  };
  metricsCurrentMonth: FinancialMetrics;
  metricsPreviousMonth: FinancialMetrics;
  monthOverMonth: {
    receitasVarPct: number | null;
    despesasVarPct: number | null;
    saldoVarPct: number | null;
  };
  topExpenseCategories: { name: string; amount: number; percentage: number }[];
  topRevenueCategories: { name: string; amount: number; percentage: number }[];
  pendingReceipts: { title: string; amount: number; dueDate: string }[];
  pendingPayments: { title: string; amount: number; dueDate: string }[];
  overdueReceipts: { title: string; amount: number; dueDate: string }[];
  overduePayments: { title: string; amount: number; dueDate: string }[];
  totalTransactionsCount: number;
  recentTransactions: {
    date: string;
    title: string;
    type: 'entrada' | 'saida';
    amount: number;
    category: string;
    status: string;
  }[];
}

export function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

/**
 * Builds the authoritative financial briefing for the authorized context and user.
 * Strictly calculates all numbers using official MCO financial math functions.
 */
export function buildFinancialContext(
  transactions: Transaction[],
  accountType: AccountType,
  refYear?: number,
  refMonthIndex?: number
): FinancialContextBriefing {
  const today = getTodayDateStr();
  const d = new Date();
  const currentYear = refYear ?? d.getFullYear();
  const currentMonthIndex = refMonthIndex ?? d.getMonth();

  // Previous month calculation
  const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const prevYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;

  // STRICT CONTEXT ISOLATION: Filter ONLY the transactions belonging to the authorized accountType
  const authorizedTxs = transactions.filter(t => (t.accountType || 'empresarial') === accountType);

  // Official calculations
  const metricsCurrent = calculateMonthlyFinancialMetrics(authorizedTxs, currentYear, currentMonthIndex);
  const metricsPrev = calculateMonthlyFinancialMetrics(authorizedTxs, prevYear, prevMonthIndex);

  // Month-over-month percentage changes
  const calcVar = (current: number, prev: number): number | null => {
    if (prev === 0) return null;
    return Number((((current - prev) / Math.abs(prev)) * 100).toFixed(1));
  };

  const monthOverMonth = {
    receitasVarPct: calcVar(metricsCurrent.entradasRealizadas, metricsPrev.entradasRealizadas),
    despesasVarPct: calcVar(metricsCurrent.saidasRealizadas, metricsPrev.saidasRealizadas),
    saldoVarPct: calcVar(metricsCurrent.saldoRealizado, metricsPrev.saldoRealizado),
  };

  // Group categories for current month (Realized only)
  const categoryExpenses: Record<string, number> = {};
  const categoryRevenues: Record<string, number> = {};
  const pendingReceiptsList: { title: string; amount: number; dueDate: string }[] = [];
  const pendingPaymentsList: { title: string; amount: number; dueDate: string }[] = [];
  const overdueReceiptsList: { title: string; amount: number; dueDate: string }[] = [];
  const overduePaymentsList: { title: string; amount: number; dueDate: string }[] = [];

  for (const tx of authorizedTxs) {
    const status = resolveTransactionStatus(tx);
    if (status === 'cancelado') continue;

    const isRealized = status === 'realizado';
    const isPending = status === 'pendente';
    const refDate = isRealized ? (tx.effectiveDate || tx.date) : (tx.dueDate || tx.date);
    if (!refDate) continue;

    const [tY, tM] = refDate.split('-').map(Number);
    const isInMonth = tY === currentYear && tM === currentMonthIndex + 1;

    if (isRealized && isInMonth) {
      const val = tx.amountPaid !== undefined ? tx.amountPaid : tx.amount;
      const cat = tx.category || 'Outros';
      if (tx.type === 'saida') {
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + val;
      } else {
        categoryRevenues[cat] = (categoryRevenues[cat] || 0) + val;
      }
    }

    if (isPending) {
      const due = tx.dueDate || tx.date || today;
      const item = { title: tx.title || tx.category, amount: tx.amount, dueDate: due };
      if (due < today) {
        if (tx.type === 'entrada') {
          overdueReceiptsList.push(item);
        } else {
          overduePaymentsList.push(item);
        }
      } else if (isInMonth) {
        if (tx.type === 'entrada') {
          pendingReceiptsList.push(item);
        } else {
          pendingPaymentsList.push(item);
        }
      }
    }
  }

  // Rank top expense categories
  const totalExp = metricsCurrent.saidasRealizadas || 1;
  const topExpenseCategories = Object.entries(categoryExpenses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: Number(((amount / totalExp) * 100).toFixed(1)),
    }));

  // Rank top revenue categories
  const totalRev = metricsCurrent.entradasRealizadas || 1;
  const topRevenueCategories = Object.entries(categoryRevenues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: Number(((amount / totalRev) * 100).toFixed(1)),
    }));

  // Sample recent transactions (up to 15 items)
  const recentTransactions = [...authorizedTxs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)
    .map(t => ({
      date: t.date,
      title: t.title || t.category,
      type: t.type,
      amount: t.amount,
      category: t.category,
      status: resolveTransactionStatus(t),
    }));

  return {
    accountType,
    accountLabel: accountType === 'pessoal' ? 'Conta Pessoal (Finanças Pessoais)' : 'Conta Empresarial (Negócio/MEI/PJ)',
    currentPeriod: {
      year: currentYear,
      monthIndex: currentMonthIndex,
      monthName: MONTHS_PT[currentMonthIndex],
    },
    metricsCurrentMonth: metricsCurrent,
    metricsPreviousMonth: metricsPrev,
    monthOverMonth,
    topExpenseCategories,
    topRevenueCategories,
    pendingReceipts: pendingReceiptsList,
    pendingPayments: pendingPaymentsList,
    overdueReceipts: overdueReceiptsList,
    overduePayments: overduePaymentsList,
    totalTransactionsCount: authorizedTxs.length,
    recentTransactions,
  };
}

/**
 * Builds the textual financial context prompt injected into Gemini.
 */
export function buildPromptContextText(briefing: FinancialContextBriefing): string {
  const m = briefing.metricsCurrentMonth;
  const prev = briefing.metricsPreviousMonth;
  const pName = briefing.currentPeriod.monthName;
  const pYear = briefing.currentPeriod.year;
  const prevName = MONTHS_PT[briefing.currentPeriod.monthIndex === 0 ? 11 : briefing.currentPeriod.monthIndex - 1];

  let text = `=====================================================
DADOS FINANCEIROS OFICIAIS DO MCO (MEU CAIXA ORGANIZADO)
=====================================================
CONTEXTO ATIVO: ${briefing.accountLabel}
ATENÇÃO CRÍTICA DE ISOLAMENTO: Estes dados são EXCLUSIVOS da ${briefing.accountLabel}. Não mencione nem misture movimentações de outros contextos.

PERÍODO ANALISADO: ${pName} de ${pYear}

1. TOTAIS REALIZADOS OFICIAIS (Dinheiro efetivamente movimentado no caixa):
- Receitas Realizadas (entradas confirmadas): ${formatBRL(m.entradasRealizadas)}
  * Receitas Fixas Realizadas: ${formatBRL(m.receitasFixasRealizadas)}
  * Receitas Variáveis Realizadas: ${formatBRL(m.receitasVariaveisRealizadas)}
- Despesas Realizadas (saídas confirmadas): ${formatBRL(m.saidasRealizadas)}
  * Despesas Fixas Realizadas: ${formatBRL(m.despesasFixasRealizadas)}
  * Despesas Variáveis Realizadas: ${formatBRL(m.despesasVariaveisRealizadas)}
- Saldo Líquido Realizado (Resultado do período): ${formatBRL(m.saldoRealizado)} (${m.saldoRealizado >= 0 ? 'POSITIVO' : 'NEGATIVO'})
- Total de Lançamentos Realizados: ${m.realizadasCount}

2. PREVISÕES E PENDÊNCIAS (Valores previstos/não confirmados - NUNCA trate como dinheiro no bolso):
- Receitas Previstas (a receber): ${formatBRL(m.entradasPrevistas)}
- Despesas Previstas (a pagar): ${formatBRL(m.saidasPrevistas)}
- Saldo Previsto Estimado: ${formatBRL(m.saldoPrevisto)}
- Quantidade de Lançamentos Pendentes: ${m.pendentesCount}

3. CONTAS EM ATRASO (Atenção prioritária):
- Despesas em atraso (contas vencidas sem pagamento): ${m.qtdDespesasEmAtraso} conta(s) totalizando ${formatBRL(m.despesasEmAtraso)}
- Receitas em atraso (clientes com pagamento vencido): ${m.qtdReceitasEmAtraso} receita(s) totalizando ${formatBRL(m.receitasEmAtraso)}
`;

  if (briefing.overduePayments.length > 0) {
    text += `\nDetalhes de Despesas em Atraso:\n`;
    briefing.overduePayments.slice(0, 5).forEach(p => {
      text += `  * ${p.title} - ${formatBRL(p.amount)} (Venceu em: ${p.dueDate})\n`;
    });
  }

  if (briefing.pendingPayments.length > 0) {
    text += `\nPróximas Despesas a Pagar no mês:\n`;
    briefing.pendingPayments.slice(0, 5).forEach(p => {
      text += `  * ${p.title} - ${formatBRL(p.amount)} (Vence em: ${p.dueDate})\n`;
    });
  }

  if (briefing.pendingReceipts.length > 0) {
    text += `\nPróximas Receitas a Receber no mês:\n`;
    briefing.pendingReceipts.slice(0, 5).forEach(r => {
      text += `  * ${r.title} - ${formatBRL(r.amount)} (Previsão: ${r.dueDate})\n`;
    });
  }

  text += `\n4. COMPARATIVO COM O MÊS ANTERIOR (${prevName}):
- Receitas Mês Anterior: ${formatBRL(prev.entradasRealizadas)} (Variação: ${briefing.monthOverMonth.receitasVarPct !== null ? `${briefing.monthOverMonth.receitasVarPct > 0 ? '+' : ''}${briefing.monthOverMonth.receitasVarPct}%` : 'sem base de comparação'})
- Despesas Mês Anterior: ${formatBRL(prev.saidasRealizadas)} (Variação: ${briefing.monthOverMonth.despesasVarPct !== null ? `${briefing.monthOverMonth.despesasVarPct > 0 ? '+' : ''}${briefing.monthOverMonth.despesasVarPct}%` : 'sem base de comparação'})
- Saldo Mês Anterior: ${formatBRL(prev.saldoRealizado)} (Variação: ${briefing.monthOverMonth.saldoVarPct !== null ? `${briefing.monthOverMonth.saldoVarPct > 0 ? '+' : ''}${briefing.monthOverMonth.saldoVarPct}%` : 'sem base de comparação'})

5. MAIORES CATEGORIAS DE DESPESAS (Realizadas):
`;
  if (briefing.topExpenseCategories.length === 0) {
    text += `  * Nenhuma despesa realizada registrada no período.\n`;
  } else {
    briefing.topExpenseCategories.forEach((c, i) => {
      text += `  ${i + 1}. ${c.name}: ${formatBRL(c.amount)} (${c.percentage}% do total de despesas)\n`;
    });
  }

  text += `\n6. MAIORES CATEGORIAS DE RECEITAS (Realizadas):\n`;
  if (briefing.topRevenueCategories.length === 0) {
    text += `  * Nenhuma receita realizada registrada no período.\n`;
  } else {
    briefing.topRevenueCategories.forEach((c, i) => {
      text += `  ${i + 1}. ${c.name}: ${formatBRL(c.amount)} (${c.percentage}% do total de receitas)\n`;
    });
  }

  text += `\n7. TOTAL DE MOVIMENTAÇÕES HISTÓRICAS DISPONÍVEIS: ${briefing.totalTransactionsCount}\n`;

  if (briefing.recentTransactions.length > 0) {
    text += `\nÚLTIMAS MOVIMENTAÇÕES REGISTRADAS:\n`;
    briefing.recentTransactions.slice(0, 10).forEach(t => {
      text += `  * [${t.date}] ${t.title} (${t.category}) - ${t.type === 'entrada' ? '+' : '-'}${formatBRL(t.amount)} [Status: ${t.status}]\n`;
    });
  }

  text += `=====================================================\n`;
  return text;
}
