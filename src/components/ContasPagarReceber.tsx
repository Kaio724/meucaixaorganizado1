import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Transaction,
  UserProfile,
  TransactionType,
  AccountType,
} from '../types';
import {
  calculateMonthlyFinancialMetrics,
  getTransactionDueStatus,
  isTransactionRealized,
  isTransactionPending,
  getTodayDateStr,
  DueAlertStatus,
  settleTransaction,
  unsettleTransaction,
} from '../lib/financialMath';
import { getCategoryInfo } from '../lib/categories';
import ConfirmSettlementModal from './ConfirmSettlementModal';
import TransactionDetailSheet from './TransactionDetailSheet';

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface ContasPagarReceberProps {
  profile: UserProfile;
  userId?: string;
  accountType?: AccountType;
  transactions: Transaction[];
  initialFilter?: FilterTab;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void> | void;
  onEditTransaction: (tx: Transaction) => Promise<void> | void;
  onDeleteTransaction: (id: string) => Promise<void> | void;
  onNavigateToTab?: (tab: any) => void;
}

export type FilterTab = 'todas' | 'a_receber' | 'a_pagar' | 'pendentes' | 'em_atraso' | 'concluidas';

export default function ContasPagarReceber({
  profile,
  userId = 'default_user',
  accountType = 'empresarial',
  transactions,
  initialFilter = 'todas',
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateToTab,
}: ContasPagarReceberProps) {
  const now = new Date();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [scopeFilter, setScopeFilter] = useState<'mes' | 'tudo'>('mes');
  const [activeFilter, setActiveFilter] = useState<FilterTab>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');

  // Settlement Modal State
  const [settlementTx, setSettlementTx] = useState<Transaction | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Detail Sheet State
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);

  // Quick Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<TransactionType>('saida');
  const [addTitle, setAddTitle] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDueDate, setAddDueDate] = useState(getTodayDateStr());
  const [addCategory, setAddCategory] = useState('');
  const [addPaymentMethod, setAddPaymentMethod] = useState('Pix');
  const [addDescription, setAddDescription] = useState('');
  const [addIsPending, setAddIsPending] = useState(true);
  const [addLoading, setAddLoading] = useState(false);

  const todayStr = getTodayDateStr();

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Scope transactions strictly to accountType
  const scopedTransactions = useMemo(() => {
    return transactions.filter(
      (t) => (t.accountType || 'empresarial') === accountType
    );
  }, [transactions, accountType]);

  // Financial Metrics for the selected period
  const metrics = useMemo(() => {
    return calculateMonthlyFinancialMetrics(
      scopedTransactions,
      selectedYear,
      selectedMonthIndex
    );
  }, [scopedTransactions, selectedYear, selectedMonthIndex]);

  // Filter transactions for display
  const displayedTransactions = useMemo(() => {
    return scopedTransactions.filter((tx) => {
      // 1. Period filter (if scope is 'mes')
      if (scopeFilter === 'mes') {
        const refDate = isTransactionRealized(tx)
          ? tx.effectiveDate || tx.date
          : tx.dueDate || tx.date;
        if (!refDate) return false;
        const [y, m] = refDate.split('-').map(Number);
        if (y !== selectedYear || m !== selectedMonthIndex + 1) {
          // If viewing month, but item is overdue and pending, optionally show it if user is in 'em_atraso'
          if (activeFilter === 'em_atraso') {
            const dueStatus = getTransactionDueStatus(tx, todayStr);
            if (dueStatus !== 'atrasado') return false;
          } else {
            return false;
          }
        }
      }

      // 2. Tab Filter
      const isRealized = isTransactionRealized(tx);
      const isPending = isTransactionPending(tx);
      const dueStatus = getTransactionDueStatus(tx, todayStr);

      if (activeFilter === 'a_receber') {
        if (tx.type !== 'entrada' || !isPending) return false;
      } else if (activeFilter === 'a_pagar') {
        if (tx.type !== 'saida' || !isPending) return false;
      } else if (activeFilter === 'pendentes') {
        if (!isPending) return false;
      } else if (activeFilter === 'em_atraso') {
        if (dueStatus !== 'atrasado') return false;
      } else if (activeFilter === 'concluidas') {
        if (!isRealized) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        if (!titleMatch && !catMatch && !descMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort: overdue first, then by due date ascending
      const dateA = a.dueDate || a.date;
      const dateB = b.dueDate || b.date;
      return dateA.localeCompare(dateB);
    });
  }, [
    scopedTransactions,
    scopeFilter,
    selectedYear,
    selectedMonthIndex,
    activeFilter,
    searchQuery,
    todayStr,
  ]);

  // Settlement Handler
  const handleConfirmSettlement = async (
    tx: Transaction,
    actualAmount: number,
    actualDate: string,
    observation?: string
  ) => {
    const updated = settleTransaction(tx, actualAmount, actualDate, observation);
    await onEditTransaction(updated);
  };

  const handleUnsettleTransaction = async (tx: Transaction) => {
    const updated = unsettleTransaction(tx);
    await onEditTransaction(updated);
  };

  // Add new payable/receivable
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim() || !addAmount || addLoading) return;
    const num = parseFloat(addAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;

    setAddLoading(true);
    try {
      const newTx: Omit<Transaction, 'id'> = {
        title: addTitle.trim(),
        amount: num,
        type: addType,
        date: addDueDate,
        dueDate: addDueDate,
        status: addIsPending ? 'pendente' : 'realizado',
        effectiveDate: addIsPending ? undefined : addDueDate,
        category: addCategory || (addType === 'entrada' ? 'Cliente Avulso' : 'Outros'),
        paymentMethod: addPaymentMethod || 'Pix',
        description: addDescription.trim() || undefined,
        accountType: accountType,
        expenseType: addType === 'saida' ? 'variavel' : undefined,
        revenueType: addType === 'entrada' ? 'variavel' : undefined,
      };

      await onAddTransaction(newTx);
      setShowAddModal(false);
      setAddTitle('');
      setAddAmount('');
      setAddDescription('');
    } catch (e) {
      console.warn('Erro ao criar lançamento:', e);
    } finally {
      setAddLoading(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (tx: Transaction) => {
    const dueStatus = getTransactionDueStatus(tx, todayStr);

    switch (dueStatus) {
      case 'recebido':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            Recebido
          </span>
        );
      case 'pago':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            Pago
          </span>
        );
      case 'atrasado':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-error/15 text-error border border-error/30 animate-pulse">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            Em atraso
          </span>
        );
      case 'vence_hoje':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            Vence hoje
          </span>
        );
      case 'a_vencer':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
            A vencer
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1440px] mx-auto pb-12 text-left">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full">
              Controle de Previsões & Baixas
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
              {accountType === 'pessoal' ? 'Pessoal' : 'Empresarial'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">
            Contas a Pagar e a Receber
          </h1>
          <p className="text-xs text-on-surface-variant font-medium">
            Acompanhe o que tem a pagar e a receber com separação estrita entre o valor previsto e o dinheiro já realizado no caixa.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-2xl px-2 py-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="text-xs font-bold text-on-surface px-2 min-w-[110px] text-center select-none uppercase tracking-wide">
              {MONTHS_PT[selectedMonthIndex]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          {/* Scope Selector: Month vs All */}
          <div className="flex bg-black/40 border border-white/10 rounded-2xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setScopeFilter('mes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'mes'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('tudo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'tudo'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Todo Histórico
            </button>
          </div>

          {/* Quick Add Button */}
          <button
            onClick={() => {
              setAddType('saida');
              setShowAddModal(true);
            }}
            className="bg-primary hover:bg-[#8455ef] text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-2xl flex items-center gap-1.5 shadow-lg shadow-primary/20 transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* TOP INDICATORS: Realized vs Projected */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Previsto a Receber */}
        <div className="bg-surface-container-low/70 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            A Receber (Previsto)
          </span>
          <div className="mt-1">
            <span className="text-base lg:text-lg font-black text-blue-400">
              {formatBRL(metrics.entradasPrevistas)}
            </span>
          </div>
          <span className="text-[9px] text-on-surface-variant/70 font-semibold mt-1">
            Aguardando baixa
          </span>
        </div>

        {/* 2. Previsto a Pagar */}
        <div className="bg-surface-container-low/70 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            A Pagar (Previsto)
          </span>
          <div className="mt-1">
            <span className="text-base lg:text-lg font-black text-amber-400">
              {formatBRL(metrics.saidasPrevistas)}
            </span>
          </div>
          <span className="text-[9px] text-on-surface-variant/70 font-semibold mt-1">
            Aguardando pagamento
          </span>
        </div>

        {/* 3. Total Recebido (Realizado) */}
        <div className="bg-surface-container-low/70 border border-emerald-500/20 bg-emerald-500/[0.03] rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-wider">
            Total Recebido
          </span>
          <div className="mt-1">
            <span className="text-base lg:text-lg font-black text-emerald-400">
              {formatBRL(metrics.entradasRealizadas)}
            </span>
          </div>
          <span className="text-[9px] text-emerald-400/60 font-semibold mt-1">
            Efetivado no caixa
          </span>
        </div>

        {/* 4. Total Pago (Realizado) */}
        <div className="bg-surface-container-low/70 border border-rose-500/20 bg-rose-500/[0.03] rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-400/90 uppercase tracking-wider">
            Total Pago
          </span>
          <div className="mt-1">
            <span className="text-base lg:text-lg font-black text-rose-400">
              {formatBRL(metrics.saidasRealizadas)}
            </span>
          </div>
          <span className="text-[9px] text-rose-400/60 font-semibold mt-1">
            Descontado do caixa
          </span>
        </div>

        {/* 5. Receitas em Atraso */}
        <div className={`bg-surface-container-low/70 border rounded-2xl p-3 flex flex-col justify-between ${
          metrics.receitasEmAtraso > 0 ? 'border-error/40 bg-error/5' : 'border-white/5'
        }`}>
          <span className="text-[10px] font-bold text-error uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
            Receitas em Atraso
          </span>
          <div className="mt-1">
            <span className="text-base lg:text-lg font-black text-error">
              {formatBRL(metrics.receitasEmAtraso)}
            </span>
          </div>
          <span className="text-[9px] text-error/70 font-semibold mt-1">
            {metrics.qtdReceitasEmAtraso} pendente(s)
          </span>
        </div>

        {/* 6. Despesas em Atraso */}
        <div className={`bg-surface-container-low/70 border rounded-2xl p-3 flex flex-col justify-between ${
          metrics.despesasEmAtraso > 0 ? 'border-error/40 bg-error/5' : 'border-white/5'
        }`}>
          <span className="text-[10px] font-bold text-error uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
            Despesas em Atraso
          </span>
          <div className="mt-1">
            <span className="text-base lg:text-lg font-black text-error">
              {formatBRL(metrics.despesasEmAtraso)}
            </span>
          </div>
          <span className="text-[9px] text-error/70 font-semibold mt-1">
            {metrics.qtdDespesasEmAtraso} vencida(s)
          </span>
        </div>
      </div>

      {/* FILTERS TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-low/60 border border-white/5 p-2 rounded-2xl">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'todas' as FilterTab, label: 'Todas' },
            { id: 'a_receber' as FilterTab, label: 'A Receber' },
            { id: 'a_pagar' as FilterTab, label: 'A Pagar' },
            { id: 'pendentes' as FilterTab, label: 'Pendentes' },
            { id: 'em_atraso' as FilterTab, label: 'Em Atraso' },
            { id: 'concluidas' as FilterTab, label: 'Concluídas' },
          ].map((tab) => {
            const isTabActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] md:w-64">
          <span className="material-symbols-outlined text-sm text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição ou categoria..."
            className="w-full bg-[#111115] border border-white/10 rounded-xl py-1.5 pl-8 pr-3 text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* TRANSACTIONS LIST */}
      {displayedTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container-low/40 border border-white/5 rounded-3xl text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant">
              fact_check
            </span>
          </div>
          <h3 className="text-sm font-bold text-on-surface">
            Nenhum lançamento encontrado
          </h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
            Não há lançamentos correspondentes aos filtros selecionados para este período.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {displayedTransactions.map((tx) => {
            const isEntrada = tx.type === 'entrada';
            const isRealized = isTransactionRealized(tx);
            const dueDateStr = tx.dueDate || tx.date;
            const categoryInfo = getCategoryInfo(tx.category, tx.type, userId);

            return (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isRealized
                    ? 'bg-surface-container-low/30 border-white/5'
                    : 'bg-surface-container-low/80 border-white/10 hover:border-primary/40'
                }`}
              >
                {/* Left Section: Icon & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isEntrada
                        ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/25'
                        : 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/25'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {categoryInfo?.icon || (isEntrada ? 'arrow_downward' : 'arrow_upward')}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-on-surface truncate">
                        {tx.title}
                      </h4>
                      {renderStatusBadge(tx)}
                      {tx.recurrenceId && (
                        <span className="text-[9px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 rounded-md">
                          Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-on-surface-variant flex-wrap">
                      <span className="font-semibold">{tx.category}</span>
                      <span>•</span>
                      <span>Vencimento: {new Date(dueDateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      {isRealized && tx.effectiveDate && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">
                            Baixa em: {new Date(tx.effectiveDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </>
                      )}
                      {tx.observation && (
                        <>
                          <span>•</span>
                          <span className="italic truncate max-w-[200px]" title={tx.observation}>
                            Obs: {tx.observation}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Amount & Action Button */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                  <div className="flex flex-col md:text-right">
                    <span
                      className={`text-base font-black ${
                        isEntrada ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isEntrada ? '+' : '-'} {formatBRL(isRealized && tx.amountPaid !== undefined ? tx.amountPaid : tx.amount)}
                    </span>
                    {isRealized && tx.amountPaid !== undefined && tx.amountPaid !== tx.amount && (
                      <span className="text-[9px] text-on-surface-variant line-through">
                        Prev: {formatBRL(tx.amount)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Primary Settlement Button */}
                    {!isRealized ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementTx(tx);
                          setIsSettlementModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ${
                          isEntrada
                            ? 'bg-[#10b981] hover:bg-[#059669] shadow-[#10b981]/25'
                            : 'bg-[#ef4444] hover:bg-[#dc2626] shadow-[#ef4444]/25'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        {isEntrada ? 'Receber' : 'Pagar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementTx(tx);
                          setIsSettlementModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
                        title="Ver ou ajustar baixa"
                      >
                        <span className="material-symbols-outlined text-sm">edit_note</span>
                        Ajustar
                      </button>
                    )}

                    {/* Details Sheet Trigger */}
                    <button
                      type="button"
                      onClick={() => setDetailTx(tx)}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                      title="Ver detalhes do lançamento"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation of Settlement Modal */}
      <ConfirmSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setSettlementTx(null);
        }}
        transaction={settlementTx}
        onConfirm={handleConfirmSettlement}
        onUnsettle={handleUnsettleTransaction}
      />

      {/* Detail Sheet */}
      {detailTx && (
        <TransactionDetailSheet
          transaction={detailTx}
          isOpen={!!detailTx}
          onClose={() => setDetailTx(null)}
          onEdit={() => {
            setSettlementTx(detailTx);
            setIsSettlementModalOpen(true);
            setDetailTx(null);
          }}
          onDelete={async (id) => {
            if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
              await onDeleteTransaction(id);
              setDetailTx(null);
            }
          }}
        />
      )}

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#18181c] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-on-surface">
                  Novo Lançamento / Previsão
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Entrada vs Saida Toggle */}
              <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 mb-4 gap-1">
                <button
                  type="button"
                  onClick={() => setAddType('saida')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    addType === 'saida'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  Conta a Pagar (Despesa)
                </button>
                <button
                  type="button"
                  onClick={() => setAddType('entrada')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    addType === 'entrada'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  Conta a Receber (Receita)
                </button>
              </div>

              <form onSubmit={handleAddNewItem} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Ex: Fornecedor de Embalagens, Cliente Projeto X..."
                    className="w-full bg-[#111115] border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                      Valor Previsto (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-[#111115] border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                      Data de Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={addDueDate}
                      onChange={(e) => setAddDueDate(e.target.value)}
                      className="w-full bg-[#111115] border border-white/10 rounded-xl py-2 px-3 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Status Toggle: Pendente vs Já Realizado */}
                <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/5 rounded-xl cursor-pointer"
                     onClick={() => setAddIsPending(!addIsPending)}>
                  <input
                    type="checkbox"
                    checked={addIsPending}
                    onChange={(e) => setAddIsPending(e.target.checked)}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">
                      Salvar como previsão pendente (não afeta o caixa agora)
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      Você poderá confirmar o recebimento/pagamento quando a movimentação for realizada.
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-[#8455ef] text-white shadow-lg shadow-primary/20"
                  >
                    {addLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
