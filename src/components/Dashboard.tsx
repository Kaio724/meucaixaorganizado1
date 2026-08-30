import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile, TransactionType } from '../types';
import { AVAILABLE_CATEGORIES, PAYMENT_METHODS, ACCOUNT_OPTIONS } from '../initialData';
import { getCategoryNamesByType, getCategoryInfo } from '../lib/categories';
import EvolutionCard from './EvolutionCard';
import ProGrowthPanel from './ProGrowthPanel';
import ProInsights from './ProInsights';
import MonthComparison from './MonthComparison';
import DesktopDashboard from './DesktopDashboard';
import ImportModal from './ImportModal';
import TransactionDetailSheet from './TransactionDetailSheet';

const CHECKOUT_PRO_URL = import.meta.env.VITE_CHECKOUT_PRO_URL || 'https://pay.cakto.com.br/rdvxqwt';

interface DashboardProps {
  profile: UserProfile;
  userId?: string;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onNavigateToTab: (tab: 'dashboard' | 'historico' | 'retirar' | 'resumo') => void;
}

export default function Dashboard({ 
  profile, 
  userId = 'default_user', 
  transactions, 
  onAddTransaction, 
  onEditTransaction,
  onDeleteTransaction,
  onNavigateToTab 
}: DashboardProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const isPro = (profile.plan || 'essential') === 'pro';
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [txType, setTxType] = useState<TransactionType>('entrada');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState<string | undefined>(undefined);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // For Essential plan users, main calculations only reflect the current month.
  const visibleTransactions = isPro
    ? transactions
    : transactions.filter((t) => {
        const tDate = new Date(t.date + 'T12:00:00');
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      });

  // Calculations
  const totalEntradas = visibleTransactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = visibleTransactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSobrou = totalEntradas - totalSaidas;

  // Percentage leftover
  const sobrouPercentage = totalEntradas > 0 
    ? Math.max(0, Math.min(100, Math.round((totalSobrou / totalEntradas) * 100))) 
    : 0;

  // Change quick add category based on type
  React.useEffect(() => {
    const cats = getCategoryNamesByType(userId, txType);
    setCategory(cats[0] || 'Outros');
  }, [txType, userId]);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const parsedAmount = Math.abs(parseFloat(amount.replace(',', '.')));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddTransaction({
      title: title.trim() || category || (txType === 'entrada' ? 'Entrada Caixa' : 'Despesa Caixa'),
      amount: parsedAmount,
      type: txType,
      date,
      category,
      paymentMethod,
      account
    });

    // Reset Form
    setTitle('');
    setAmount('');
    setPaymentMethod('Pix');
    setAccount(undefined);
    setShowQuickAdd(false);
  };

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const totalRetiradas = visibleTransactions
    .filter(t => t.type === 'saida' && t.category === 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  // Recent 3 transactions for minimal, lightweight feed
  const recent3Transactions = transactions.slice(0, 3);

  return (
    <div className="w-full">
      {/* Mobile Experience - 3-Level Hierarchy & Breathable Space */}
      <div className="lg:hidden flex flex-col gap-6 w-full max-w-lg md:max-w-4xl text-left mx-auto pb-6">
        
        {/* ================= LEVEL 1: ABOVE THE FOLD ================= */}
        
        {/* Top Welcome Bar (Discreet) */}
        <div className="flex items-center justify-between col-span-12 px-0.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium tracking-wider uppercase">
                {profile.businessType === 'cnpj' ? 'MEI' : 'Autônomo'}
              </span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-extrabold border ${
                (profile.plan || 'essential') === 'pro'
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-white/10 text-zinc-400 border-white/10'
              }`}>
                {(profile.plan || 'essential') === 'pro' ? 'MCO Completo' : 'MCO Essencial'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate mt-0.5">
              Olá, <span className="text-primary">{profile.name}</span>
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {profile.businessName}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-xl">
              storefront
            </span>
          </div>
        </div>

        {/* Card Mestre: "Sobrou em Caixa" (Protagonista Absoluto) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hero-master-card rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden text-left w-full border border-primary/30 bg-gradient-to-b from-[#1b1531] via-[#140e26] to-[#0e0a1b]"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-primary/15 rounded-full filter blur-3xl pointer-events-none"></div>

          {/* Sobrou Header & Value */}
          <div className="flex flex-col gap-1.5 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(208,188,255,0.8)]"></span>
                Sobrou em Caixa
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                totalSobrou >= 0 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                {totalSobrou >= 0 ? 'Positivo' : 'Alerta'}
              </span>
            </div>

            {/* Protagonist Typography: 40-44px ExtraBold */}
            <div className="flex items-baseline gap-2 mt-1">
              <h1 className={`text-4xl sm:text-[42px] font-extrabold tracking-tight ${totalSobrou >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {formatBRL(totalSobrou)}
              </h1>
            </div>

            {/* Progress Bar & Support micro-text */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-primary to-[#9333ea] h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"
                  style={{ width: `${sobrouPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs font-bold text-primary shrink-0">
                {sobrouPercentage}% guardado
              </span>
            </div>
          </div>
        </motion.div>

        {/* Primary Action Button (Fixed & Prominent) */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => { setTxType('entrada'); setShowQuickAdd(true); }}
            className="w-full bg-gradient-to-r from-[#6d3bd7] to-[#8b4bf0] hover:from-[#7c44ea] hover:to-[#9a5df7] text-white font-extrabold h-[52px] px-5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(109,59,215,0.4)] cursor-pointer border border-primary/40 text-base select-none active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            <span className="tracking-wide">Lançar Movimentação</span>
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-bold h-[48px] sm:h-[52px] px-4 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/[0.08] hover:border-primary/30 cursor-pointer active:scale-[0.98] text-xs select-none"
          >
            <span className="material-symbols-outlined text-lg text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span>Importação Inteligente</span>
          </button>
        </div>

        {/* ================= LEVEL 2: BELOW THE FOLD ================= */}

        {/* Section: Resumo de Entradas e Saídas (Opção A - 2 cards + 1 card pró-labore) */}
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] uppercase tracking-[0.5px] text-zinc-400 font-semibold">
              Movimentação do Mês
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Entrou */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-[#130f21]/90 border border-emerald-500/20 min-h-[84px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                  Entrou
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-base">arrow_downward</span>
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight mt-1 truncate">
                {formatBRL(totalEntradas)}
              </div>
            </div>

            {/* Saiu */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-[#130f21]/90 border border-rose-500/20 min-h-[84px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                  Saiu
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400">
                  <span className="material-symbols-outlined text-base">arrow_upward</span>
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-rose-400 tracking-tight mt-1 truncate">
                {formatBRL(totalSaidas)}
              </div>
            </div>

            {/* Você Retirou (Pró-Labore) - Centralizado/Full width */}
            <div className="col-span-2 flex items-center justify-between p-4 rounded-2xl bg-[#130f21]/90 border border-primary/20 min-h-[72px] shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary border border-primary/30">
                  <span className="material-symbols-outlined text-lg">account_balance</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider block">
                    Você Retirou (Pró-Labore)
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    Transferências e retiradas pessoais
                  </span>
                </div>
              </div>
              <div className="text-lg font-extrabold text-primary tracking-tight">
                {formatBRL(totalRetiradas)}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Últimas Movimentações (3 itens no feed, toque para abrir detalhes) */}
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] uppercase tracking-[0.5px] text-zinc-400 font-semibold">
              Últimos Lançamentos
            </span>
            <button 
              onClick={() => onNavigateToTab('historico')}
              className="text-xs font-bold text-[#c4b5fd] hover:text-white flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Ver todos</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {recent3Transactions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-zinc-500 text-3xl">folder_off</span>
              <span className="text-xs text-zinc-400">Nenhum lançamento no momento</span>
            </div>
          ) : (
            <div className="bg-[#141022]/90 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
              {recent3Transactions.map((tx) => {
                const catInfo = getCategoryInfo(tx.category, tx.type, userId);
                const dateObj = tx.date ? new Date(tx.date + 'T12:00:00') : new Date();
                const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                return (
                  <div 
                    key={tx.id} 
                    onClick={() => setSelectedTxForDetail(tx)}
                    className="h-16 px-4 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'entrada' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        <span className="material-symbols-outlined text-base">
                          {tx.type === 'entrada' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate tracking-tight">
                          {tx.title}
                        </h4>
                        <span className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                          {tx.category} • {formattedDate}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <span className={`text-sm font-extrabold tracking-tight ${
                        tx.type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {tx.type === 'entrada' ? '+' : '-'} {formatBRL(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: Insights & Plano (PRO) */}
        <div className="flex flex-col gap-4 mt-4">
          {isPro ? (
            <ProGrowthPanel
              transactions={transactions}
              isPro={isPro}
              onUnlockPro={() => setShowProModal(true)}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-5 border border-primary/20 bg-gradient-to-r from-primary/10 to-transparent flex flex-col gap-3 relative overflow-hidden text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white bg-[#6934D1] px-2.5 py-0.5 rounded-full tracking-wider">
                  MCO PRO
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Desbloqueie o potencial completo do MCO
                </h3>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                  Gráficos avançados, relatórios comparativos, projeções de crescimento e mais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProModal(true)}
                className="mt-1 w-full py-2.5 rounded-xl bg-primary hover:bg-[#8b6eff] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                Conhecer o MCO PRO
              </button>
            </motion.div>
          )}
        </div>

        {/* Insights PRO Adicionais */}
        {isPro && (
          <div className="flex flex-col gap-4 mt-2">
            <EvolutionCard transactions={transactions} />
            <MonthComparison transactions={transactions} />
            <ProInsights transactions={transactions} />
          </div>
        )}

      </div>

      {/* Desktop Experience */}
      <div className="hidden lg:block w-full">
        <DesktopDashboard
          profile={profile}
          userId={userId}
          transactions={transactions}
          totalEntradas={totalEntradas}
          totalSaidas={totalSaidas}
          totalSobrou={totalSobrou}
          totalRetiradas={totalRetiradas}
          sobrouPercentage={sobrouPercentage}
          visibleTransactions={visibleTransactions}
          onAddTransaction={onAddTransaction}
          onNavigateToTab={onNavigateToTab}
          setShowQuickAdd={setShowQuickAdd}
          setShowProModal={setShowProModal}
          setTxType={setTxType}
          isPro={isPro}
          onOpenImport={() => setShowImportModal(true)}
        />
      </div>

      {/* Quick Add Dialog (Modal de Lançamento Limpo) */}
      <AnimatePresence>
        {showQuickAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
            <div className="absolute inset-0 cursor-default" onClick={() => setShowQuickAdd(false)} />

            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="glass-card rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 border-t sm:border border-white/10 w-full max-w-lg flex flex-col gap-4 relative bg-[#131020]/98 shadow-2xl max-h-[92vh] overflow-y-auto contain-scroll z-10 text-left"
            >
              {/* Drag Handle Mobile */}
              <div className="w-12 h-1 bg-white/25 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0"></div>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                    Lançar no Caixa
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    Conta Empresarial
                  </p>
                </div>
                <button 
                  onClick={() => setShowQuickAdd(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/5 gap-1 select-none h-12">
                <button
                  type="button"
                  onClick={() => setTxType('entrada')}
                  className={`h-full px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'entrada'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base font-bold">arrow_downward</span>
                  <span>Receita (Entrou)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('saida')}
                  className={`h-full px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'saida'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base font-bold">arrow_upward</span>
                  <span>Despesa (Saiu)</span>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleQuickAddSubmit} className="flex flex-col gap-4">
                {/* Hero Amount Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Valor (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0,00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`w-full bg-[#181426] border rounded-2xl pl-12 pr-4 min-h-[48px] py-3 text-xl font-extrabold text-white placeholder:text-zinc-600 focus:outline-none transition-all ${
                        txType === 'entrada'
                          ? 'border-emerald-500/30 focus:border-emerald-400'
                          : 'border-rose-500/30 focus:border-rose-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Categorias Chips */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Categoria
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                    {getCategoryNamesByType(userId, txType).map((catName) => {
                      const isSelected = category === catName;
                      return (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => setCategory(catName)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-primary/20 border-primary text-primary shadow-sm'
                              : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="truncate">{catName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Descrição Opcional */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Venda de produto, Aluguel..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#181426] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Forma de Pagamento */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">
                      Pagamento
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="bg-[#181426] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m} className="bg-[#131020] text-white">{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">
                      Data
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-[#181426] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="mt-2 w-full h-12 rounded-xl bg-gradient-to-r from-primary to-[#9333ea] hover:from-[#8b6eff] hover:to-[#a855f7] text-white font-black text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                  <span>Salvar Lançamento</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Detail Bottom Sheet (Progressive Disclosure) */}
      <TransactionDetailSheet
        transaction={selectedTxForDetail}
        isOpen={Boolean(selectedTxForDetail)}
        onClose={() => setSelectedTxForDetail(null)}
        userId={userId}
        onEdit={(tx) => {
          if (onEditTransaction) {
            onEditTransaction(tx);
          } else {
            onNavigateToTab('historico');
          }
        }}
        onDelete={(id) => {
          if (onDeleteTransaction) {
            onDeleteTransaction(id);
          }
        }}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        profile={profile}
        userId={userId}
        onAddTransaction={onAddTransaction}
        onUpgradePlan={() => setShowProModal(true)}
      />
    </div>
  );
}
