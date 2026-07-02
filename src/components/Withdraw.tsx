import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';

interface WithdrawProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onNavigateToTab: (tab: 'dashboard' | 'historico' | 'retirar' | 'resumo') => void;
}

export default function Withdraw({ transactions, onAddTransaction, onNavigateToTab }: WithdrawProps) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Pró-labore');
  const [destination, setDestination] = useState('Pix');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [success, setSuccess] = useState(false);

  // Calculations for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter transactions that belong to this month
  const thisMonthTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00'); // avoiding timezone offset shifting the date
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  // Calculate total inflow (entradas) and total outflow (saídas)
  // We exclude previous 'Pro-Labore' payouts from total business outflows to see what "sobrou no negócio" actually is before taking out salary/dividends
  const totalEntradas = thisMonthTransactions
    .filter((t) => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = thisMonthTransactions
    .filter((t) => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const sobrou = Math.max(0, totalEntradas - totalSaidas);
  const percentualSeguro = 0.30; // 30%
  const valorSugerido = sobrou * percentualSeguro;

  const totalRetiradoEsteMes = thisMonthTransactions
    .filter((t) => t.type === 'saida' && t.category === 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const aindaPodeRetirar = Math.max(0, valorSugerido - totalRetiradoEsteMes);

  // Currency formatter
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleOpenModal = () => {
    // Pre-fill amount with the safe withdrawal suggestion
    setAmount(aindaPodeRetirar > 0 ? aindaPodeRetirar.toFixed(2) : '');
    setCategory('Pró-labore');
    setDestination('Pix');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    onAddTransaction({
      title: `Retirada - ${category}`,
      amount: Math.abs(parseFloat(amount)),
      type: 'saida',
      date,
      category: 'Pro-Labore', // map to standard category
      paymentMethod: destination,
      description: notes.trim() || `Retirada para fins de ${category}`
    });

    setSuccess(true);
    setAmount('');
    setNotes('');

    setTimeout(() => {
      setSuccess(false);
      setShowModal(false);
      onNavigateToTab('historico');
    }, 2500);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-24">
      
      {/* Title Header */}
      <div className="px-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight md:text-3xl font-sans mt-2">
          Quanto posso retirar?
        </h2>
        <p className="text-sm text-on-surface-variant/80 mt-1.5 leading-relaxed font-medium">
          Uma sugestão simples pra você tirar dinheiro pro pessoal sem apertar o caixa do negócio.
        </p>
      </div>

      {/* Main Safe Withdrawal Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[32px] p-6 border border-primary/10 flex flex-col items-center text-center gap-4 bg-gradient-to-b from-[#1a1a22]/80 to-[#121217]/90 mt-6 relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl pointer-events-none"></div>
        
        {/* Piggy icon wrapper */}
        <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(109,59,215,0.15)]">
          <span className="material-symbols-outlined text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
            savings
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface-variant/90">
            Você pode retirar com segurança até
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight select-all">
            {formatBRL(aindaPodeRetirar)}
          </h1>
        </div>

        <p className="text-xs md:text-sm text-on-surface-variant/70 max-w-xs leading-relaxed font-medium">
          Com base no que sobrou este mês, esse é o valor que você pode tirar sem prejudicar seu negócio.
        </p>
      </motion.div>

      {/* Detailed Breakdown Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-[28px] p-6 border border-outline-variant/10 flex flex-col gap-4 bg-gradient-to-b from-[#181820]/50 to-[#111116]/50 mt-4 shadow-lg"
      >
        {/* Row 1 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface-variant/80">
            Sobrou no negócio este mês
          </span>
          <span className="text-sm font-extrabold text-white">
            {formatBRL(sobrou)}
          </span>
        </div>

        {/* Row 2 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface-variant/80">
            Percentual seguro pra retirada (30%)
          </span>
          <span className="text-sm font-extrabold text-white">
            {formatBRL(valorSugerido)}
          </span>
        </div>

        <div className="h-px bg-outline-variant/20 my-1"></div>

        {/* Row 3 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface-variant/80">
            Ainda pode retirar
          </span>
          <span className="text-base md:text-lg font-extrabold text-primary shadow-sm">
            {formatBRL(aindaPodeRetirar)}
          </span>
        </div>
      </motion.div>

      {/* Info Warning Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-[20px] p-5 border border-outline-variant/10 flex items-start gap-3 bg-white/[0.015] mt-4 shadow-sm"
      >
        <span className="material-symbols-outlined text-on-surface-variant/70 text-xl mt-0.5 select-none">
          info
        </span>
        <p className="text-xs text-on-surface-variant/70 leading-relaxed font-medium">
          É só uma sugestão pra te ajudar a se pagar sem descapitalizar o negócio. Você decide o valor final.
        </p>
      </motion.div>

      {/* Primary Submit Action Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleOpenModal}
        className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_14px_rgba(109,59,215,0.25)] hover:shadow-[0_4px_20px_rgba(109,59,215,0.4)] cursor-pointer border border-primary/30 mt-6 select-none"
      >
        <span className="text-sm tracking-wide font-bold">Registrar retirada</span>
        <span className="material-symbols-outlined text-lg font-bold">
          arrow_forward
        </span>
      </motion.button>

      {/* Registrar Retirada Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            
            {/* Backdrop click closer */}
            <div className="absolute inset-0 cursor-default" onClick={() => !success && setShowModal(false)} />

            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full sm:max-w-md bg-[#131315] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col gap-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl pointer-events-none"></div>

              <AnimatePresence mode="wait">
                {!success ? (
                  <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-on-surface">
                          Nova retirada
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                          Débito do pró-labore ou lucro do caixa PJ
                        </p>
                      </div>
                      <button 
                        onClick={() => setShowModal(false)}
                        className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors cursor-pointer select-none"
                      >
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                      
                      {/* Amount Input (Quanto foi?) */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-on-surface-variant/90">Quanto deseja retirar?</label>
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

                      {/* Finalidade (Categoria) */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-on-surface-variant/90">Finalidade</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Pró-labore', 'Distribuição', 'Reembolso', 'Outros'].map((cat) => {
                            const isSelected = category === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(cat)}
                                className={`px-3 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-outline-variant/30 bg-surface-container text-on-surface-variant hover:text-on-surface'
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Origin/Method */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-on-surface-variant/90">Receber por onde?</label>
                        <div className="relative flex items-center bg-surface-container-low border border-outline-variant/40 rounded-2xl px-4 py-3 focus-within:border-primary transition-all">
                          <select
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-on-surface focus:outline-none cursor-pointer outline-none"
                          >
                            <option value="Pix">Pix pessoal</option>
                            <option value="Dinheiro">Dinheiro em espécie</option>
                            <option value="Transferência Bancária">Transferência PJ para PF</option>
                            <option value="Débito">Débito em conta</option>
                          </select>
                        </div>
                      </div>

                      {/* Descrição (opcional) */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-on-surface-variant/90">Descrição <span className="text-xs font-normal text-on-surface-variant/50">(opcional)</span></label>
                        <input
                          type="text"
                          placeholder="Ex.: retirada quinzenal de pró-labore..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
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

                      {/* Submit action */}
                      <button
                        type="submit"
                        className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_14px_rgba(109,59,215,0.25)] cursor-pointer border border-primary/30 mt-3 select-none"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">done</span>
                        <span className="text-sm">Salvar retirada</span>
                      </button>

                    </form>
                  </div>
                ) : (
                  <motion.div 
                    key="withdraw-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-2 shadow-[0_0_20px_rgba(109,59,215,0.3)]">
                      <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-on-surface">Retirada Registrada!</h3>
                    <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed font-medium">
                      O valor de {formatBRL(parseFloat(amount || '0'))} foi debitado do caixa e registrado com sucesso. Redirecionando...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
