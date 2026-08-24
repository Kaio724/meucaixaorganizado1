import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile, TransactionType } from '../types';
import { getPersonalCategoryInfo } from '../lib/personalCategories';

interface PersonalHistoryProps {
  profile: UserProfile;
  userId?: string;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (tx: Transaction) => void;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function PersonalHistory({
  profile,
  userId = 'default_user',
  transactions,
  onDeleteTransaction,
  onOpenAddModal,
  onOpenEditModal
}: PersonalHistoryProps) {
  const now = new Date();
  const [filterType, setFilterType] = useState<'tudo' | 'entrada' | 'saida'>('tudo');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAllTime, setShowAllTime] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  // Format currency helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Type Filter
      if (filterType !== 'tudo' && tx.type !== filterType) {
        return false;
      }

      // 2. Month filter (if not showing all time)
      if (!showAllTime && searchQuery.trim() === '') {
        const txDate = new Date(tx.date + 'T12:00:00');
        if (txDate.getMonth() !== selectedMonthIndex || txDate.getFullYear() !== selectedYear) {
          return false;
        }
      }

      // 3. Search query filter (search by title, category, description or amount)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = tx.title.toLowerCase().includes(q);
        const matchesCat = tx.category.toLowerCase().includes(q);
        const matchesDesc = tx.description ? tx.description.toLowerCase().includes(q) : false;
        const matchesAmount = tx.amount.toString().includes(q) || formatBRL(tx.amount).includes(q);
        const matchesPayment = tx.paymentMethod ? tx.paymentMethod.toLowerCase().includes(q) : false;

        if (!matchesTitle && !matchesCat && !matchesDesc && !matchesAmount && !matchesPayment) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filterType, showAllTime, searchQuery, selectedMonthIndex, selectedYear]);

  // Financial totals of the filtered selection
  const totalEntradas = filteredTransactions
    .filter((t) => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = filteredTransactions
    .filter((t) => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoFiltered = totalEntradas - totalSaidas;

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const groups: { [dateStr: string]: Transaction[] } = {};
    for (const tx of sorted) {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    }
    return groups;
  }, [filteredTransactions]);

  const dateKeys = Object.keys(groupedTransactions);

  // Helper to format date label
  const formatDateGroupLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dateStr === today) return 'Hoje';
    if (dateStr === yesterday) return 'Ontem';

    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 text-left pb-20">
      
      {/* Top Header & New Transaction Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#140f24]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/35 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <span className="material-symbols-outlined text-2xl font-bold">receipt_long</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#c4b5fd] uppercase tracking-wider bg-[#7C3AED]/15 px-2 py-0.5 rounded-full border border-[#7C3AED]/30">
              Histórico Pessoal
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              Extrato de Movimentações
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#7C3AED] hover:bg-[#8b4bf0] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.6)] cursor-pointer border border-[#c4b5fd]/30 select-none"
        >
          <span className="material-symbols-outlined text-lg font-bold">add_circle</span>
          <span>+ Novo Lançamento</span>
        </button>
      </div>

      {/* Filter Toolbar: Search, Period, Type */}
      <div className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-[28px] bg-[#120e20]/80 border border-white/5 backdrop-blur-md">
        
        {/* Search Input & All Time toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 material-symbols-outlined text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por título, categoria, valor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C3AED]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Month Selector Controls or All-time toggle */}
          <div className="flex items-center gap-2">
            {!showAllTime ? (
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5 flex-1 sm:flex-none justify-between">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="px-2 text-[11px] font-bold text-white uppercase tracking-wide min-w-[100px] text-center">
                  {MONTHS_PT[selectedMonthIndex]} {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-xs font-bold text-[#c4b5fd] text-center flex-1 sm:flex-none">
                Todo o Histórico
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAllTime(!showAllTime)}
              className={`px-3 py-2 rounded-2xl text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                showAllTime
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-black/40 text-zinc-400 border-white/5 hover:text-white'
              }`}
            >
              {showAllTime ? 'Por Mês' : 'Ver Todos'}
            </button>
          </div>
        </div>

        {/* Type Switcher Tabs: Tudo | Entradas | Saídas */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/5 self-start">
          <button
            type="button"
            onClick={() => setFilterType('tudo')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'tudo'
                ? 'bg-[#7C3AED] text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('entrada')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterType === 'entrada'
                ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            <span className="material-symbols-outlined text-sm">arrow_downward</span>
            <span>Entradas</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('saida')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterType === 'saida'
                ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'text-zinc-400 hover:text-rose-400'
            }`}
          >
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
            <span>Saídas</span>
          </button>
        </div>

        {/* Summary Mini-Bar */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Entrou</span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
              {formatBRL(totalEntradas)}
            </span>
          </div>
          <div className="flex flex-col border-x border-white/5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Saiu</span>
            <span className="text-xs sm:text-sm font-extrabold text-rose-400">
              {formatBRL(totalSaidas)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Saldo do Período</span>
            <span
              className={`text-xs sm:text-sm font-black ${
                saldoFiltered >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatBRL(saldoFiltered)}
            </span>
          </div>
        </div>

      </div>

      {/* Transactions Grouped List */}
      {dateKeys.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-3 bg-[#120e20]/80 rounded-[32px] border border-white/5">
          <div className="w-16 h-16 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/25 flex items-center justify-center text-[#c4b5fd]">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-bold text-white">Nenhum lançamento encontrado</h4>
            <p className="text-xs text-zinc-500 max-w-xs">
              {searchQuery
                ? 'Nenhum lançamento corresponde à busca realizada.'
                : 'Não há registros nesta conta pessoal no período selecionado.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#8b4bf0] text-white font-bold text-xs transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] cursor-pointer"
          >
            + Adicionar Lançamento
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {dateKeys.map((dateStr) => {
            const dayTxs = groupedTransactions[dateStr];

            return (
              <div key={dateStr} className="flex flex-col gap-2.5">
                {/* Date Group Header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                    <span className="text-xs font-bold text-zinc-300 capitalize">
                      {formatDateGroupLabel(dateStr)}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-semibold">
                    {dayTxs.length} {dayTxs.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {/* Day Items */}
                <div className="flex flex-col gap-2">
                  {dayTxs.map((tx) => {
                    const info = getPersonalCategoryInfo(tx.category, tx.type, userId);

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-[#140f24]/80 hover:bg-[#1a142e] border border-white/5 hover:border-[#7C3AED]/30 transition-all duration-150 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${info.bgColor}`}
                          >
                            <span className={`material-symbols-outlined text-xl ${info.color}`}>
                              {info.icon}
                            </span>
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#c4b5fd] transition-colors">
                              {tx.title}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                              <span className="font-medium text-zinc-400">{tx.category}</span>
                              <span>•</span>
                              <span>{tx.paymentMethod}</span>
                              {tx.description && (
                                <>
                                  <span>•</span>
                                  <span className="italic truncate max-w-[120px]">
                                    {tx.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Value & Actions */}
                        <div className="flex items-center gap-3 shrink-0 pl-3">
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-xs sm:text-sm font-black ${
                                tx.type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {tx.type === 'entrada' ? '+' : '-'} {formatBRL(tx.amount)}
                            </span>
                            <span className="text-[9px] text-zinc-500 uppercase font-semibold">
                              {tx.type === 'entrada' ? 'Receita' : 'Despesa'}
                            </span>
                          </div>

                          {/* Action Buttons (Edit & Delete) */}
                          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(tx)}
                              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-[#7C3AED]/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingTxId(tx.id)}
                              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingTxId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#181228] border border-rose-500/30 rounded-[28px] p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl font-bold">delete_forever</span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-white">Excluir Lançamento?</h3>
                <p className="text-xs text-zinc-400">
                  Esta ação é irreversível e removerá este registro do seu histórico pessoal.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingTxId(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deletingTxId) {
                      onDeleteTransaction(deletingTxId);
                      setDeletingTxId(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
