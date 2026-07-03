import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile, TransactionType } from '../types';
import { AVAILABLE_CATEGORIES, PAYMENT_METHODS } from '../initialData';

interface DashboardProps {
  profile: UserProfile;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onNavigateToTab: (tab: 'dashboard' | 'historico' | 'retirar' | 'resumo') => void;
}

export default function Dashboard({ profile, transactions, onAddTransaction, onNavigateToTab }: DashboardProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('entrada');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculations
  const totalEntradas = transactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSobrou = totalEntradas - totalSaidas;

  // Percentage leftover
  const sobrouPercentage = totalEntradas > 0 
    ? Math.max(0, Math.min(100, Math.round((totalSobrou / totalEntradas) * 100))) 
    : 0;

  // Change quick add category based on type
  React.useEffect(() => {
    setCategory(AVAILABLE_CATEGORIES[txType][0]);
  }, [txType]);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    onAddTransaction({
      title: title.trim(),
      amount: Math.abs(parseFloat(amount)),
      type: txType,
      date,
      category,
      paymentMethod
    });

    // Reset Form
    setTitle('');
    setAmount('');
    setShowQuickAdd(false);
  };

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-24">
      {/* Top Welcome Bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-on-surface-variant font-medium tracking-wider uppercase">
            {profile.businessType === 'cnpj' ? 'MEI' : 'Autônomo'}
          </span>
          <h2 className="text-xl font-bold text-on-surface tracking-tight">
            Olá, <span className="text-primary">{profile.name}</span>!
          </h2>
          <p className="text-xs text-on-surface-variant">
            {profile.businessName}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">
            storefront
          </span>
        </div>
      </div>

      {/* Main Financial Dashboard Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-[24px] p-6 shadow-xl flex flex-col gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl pointer-events-none"></div>

        {/* Sobrou (Net profit) Display */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Sobrou em Caixa
          </span>
          <div className="flex items-baseline gap-2">
            <h1 className={`text-3xl font-extrabold tracking-tight ${totalSobrou >= 0 ? 'text-on-surface' : 'text-error'}`}>
              {formatBRL(totalSobrou)}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-surface-container-low h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${sobrouPercentage}%` }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-primary">
              {sobrouPercentage}% guardado
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
          {/* Entradas */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-tertiary/10 flex items-center justify-center border border-tertiary/20">
              <span className="material-symbols-outlined text-tertiary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                arrow_upward
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                Entrou
              </span>
              <span className="text-sm font-bold text-tertiary">
                {formatBRL(totalEntradas)}
              </span>
            </div>
          </div>

          {/* Saídas */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center border border-error/20">
              <span className="material-symbols-outlined text-error text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                arrow_downward
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                Saiu
              </span>
              <span className="text-sm font-bold text-error">
                {formatBRL(totalSaidas)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wide Launch Transaction button */}
      <div className="w-full">
        <button
          onClick={() => { setTxType('entrada'); setShowQuickAdd(true); }}
          className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(109,59,215,0.4)] hover:shadow-[0_0_30px_rgba(109,59,215,0.6)] cursor-pointer active:scale-[0.98] border border-primary/30"
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
          <span className="text-sm tracking-wide font-semibold">Lançar Movimentação</span>
        </button>
      </div>

      {/* Quick Add Dialog (Matches requested layout) */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="glass-card rounded-[32px] p-6 shadow-2xl border border-primary/20 flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-on-surface">
                Novo lançamento
              </h3>
              <button 
                onClick={() => setShowQuickAdd(false)}
                className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="flex flex-col gap-5">
              
              {/* Segmented Toggles: Entrou vs Saiu */}
              <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setTxType('entrada')}
                  className={`py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'entrada' 
                      ? 'bg-[#143e2e] text-[#4edea3] border border-[#10b981]/20' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                  Entrou
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('saida')}
                  className={`py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'saida' 
                      ? 'bg-[#4c1d24] text-[#ffb4ab] border border-[#ffb4ab]/20' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm font-bold">trending_down</span>
                  Saiu
                </button>
              </div>

              {/* Quanto foi? */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant/90">Quanto foi?</label>
                <div className="relative flex items-center bg-surface-container-low border-2 border-primary/60 rounded-2xl px-4 py-3.5 focus-within:shadow-[0_0_15px_rgba(160,120,255,0.25)] transition-all">
                  <span className="text-xl font-bold text-on-surface-variant/60 mr-2">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent border-none text-on-surface font-extrabold text-xl focus:outline-none placeholder:text-on-surface-variant/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant/90">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_CATEGORIES[txType].slice(0, 3).map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant/30 bg-surface-container text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                  {/* Select other dropdown option if needed */}
                  {AVAILABLE_CATEGORIES[txType].length > 3 && (
                    <div className="relative">
                      <select
                        value={AVAILABLE_CATEGORIES[txType].includes(category) && AVAILABLE_CATEGORIES[txType].indexOf(category) >= 3 ? category : ''}
                        onChange={(e) => {
                          if (e.target.value) setCategory(e.target.value);
                        }}
                        className={`px-4 py-2 text-xs font-bold rounded-full border bg-surface-container text-on-surface-variant cursor-pointer outline-none ${
                          AVAILABLE_CATEGORIES[txType].indexOf(category) >= 3
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant/30'
                        }`}
                      >
                        <option value="">Outros...</option>
                        {AVAILABLE_CATEGORIES[txType].slice(3).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Especificação do Item ou Serviço */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant/90">Especificação do Item ou Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: corte de cabelo, compra de insumos..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/30"
                />
              </div>

              {/* Quando foi? */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant/90">Quando foi?</label>
                <div className="relative flex items-center bg-surface-container-low border border-outline-variant/40 rounded-2xl px-4 py-3 focus-within:border-primary transition-all">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-on-surface focus:outline-none"
                  />
                  <span className="material-symbols-outlined absolute right-4 text-on-surface-variant pointer-events-none text-lg">calendar_today</span>
                </div>
              </div>

              {/* Submit button matching visual style */}
              <button
                type="submit"
                className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_14px_rgba(109,59,215,0.25)] active:scale-[0.98] border border-primary/30 mt-3 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">done</span>
                <span className="text-sm">Salvar lançamento</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Short list of Recent Transactions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">list_alt</span>
            Últimos Lançamentos
          </h3>
          <button 
            onClick={() => onNavigateToTab('historico')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Ver tudo
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-container-low border border-outline-variant/10 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">folder_off</span>
            <span className="text-xs text-on-surface-variant">Nenhum lançamento cadastrado</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.slice(0, 3).map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 rounded-2xl bg-surface-container border border-outline-variant/10 flex items-center justify-between hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    tx.type === 'entrada' ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
                  }`}>
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {tx.type === 'entrada' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{tx.title}</h4>
                    <span className="text-[10px] text-on-surface-variant">
                      {tx.paymentMethod} • {tx.category}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-bold ${
                  tx.type === 'entrada' ? 'text-tertiary' : 'text-error'
                }`}>
                  {tx.type === 'entrada' ? '+' : '-'} {formatBRL(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
