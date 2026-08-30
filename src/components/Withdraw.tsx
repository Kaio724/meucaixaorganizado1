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
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 w-full max-w-lg md:max-w-4xl lg:max-w-full pb-24 lg:pb-0 text-left">
      
      {/* Title Header */}
      <div className="px-1 col-span-12">
        <div className="flex items-center gap-3 bg-[#140f24]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(208,188,255,0.2)]">
            <span className="material-symbols-outlined text-2xl font-bold">savings</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/25">
              Pró-Labore & Retiradas
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              Quanto posso retirar?
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Sugestão inteligente para transferir pro pessoal sem descapitalizar a empresa.
            </p>
          </div>
        </div>
      </div>

      {/* Left Column (Withdrawal Recommendation Card & Info) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
        {/* Main Safe Withdrawal Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-master-card rounded-[28px] p-6 border border-primary/30 flex flex-col items-center text-center gap-4 bg-gradient-to-b from-[#1b1531] via-[#140e26] to-[#0e0a1b] relative overflow-hidden shadow-2xl w-full"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/15 rounded-full filter blur-3xl pointer-events-none"></div>
          
          {/* Piggy icon wrapper */}
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/35 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(208,188,255,0.3)]">
            <span className="material-symbols-outlined text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              savings
            </span>
          </div>

          <div className="flex flex-col gap-1.5 z-10">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Você pode retirar com segurança até
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight select-all">
              {formatBRL(aindaPodeRetirar)}
            </h1>
          </div>

          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed font-medium z-10">
            Com base no que sobrou este mês, esse é o valor sugerido que você pode tirar sem prejudicar o caixa do negócio.
          </p>
        </motion.div>

        {/* Info Warning Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-4 border border-white/5 flex items-start gap-3 bg-[#120e20]/80 shadow-sm w-full backdrop-blur-md"
        >
          <span className="material-symbols-outlined text-primary text-xl mt-0.5 select-none">
            info
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed font-medium">
            É uma recomendação de gestão saudável para se pagar com segurança. Você tem total liberdade para definir o valor final.
          </p>
        </motion.div>
      </div>

      {/* Right Column (Detailed Breakdown & Main Actions) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
        {/* Detailed Breakdown Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[28px] p-6 border border-white/5 flex flex-col gap-4 bg-[#120e20]/80 backdrop-blur-md shadow-xl w-full"
        >
          {/* Row 1 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">
              Sobrou no negócio este mês
            </span>
            <span className="text-sm font-extrabold text-white">
              {formatBRL(sobrou)}
            </span>
          </div>

          {/* Row 2 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">
              Percentual seguro pra retirada (30%)
            </span>
            <span className="text-sm font-extrabold text-white">
              {formatBRL(valorSugerido)}
            </span>
          </div>

          <div className="h-px bg-white/5 my-1"></div>

          {/* Row 3 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">
              Ainda pode retirar
            </span>
            <span className="text-base md:text-lg font-extrabold text-primary shadow-sm">
              {formatBRL(aindaPodeRetirar)}
            </span>
          </div>
        </motion.div>

        {/* Primary Submit Action Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenModal}
          className="w-full bg-gradient-to-r from-[#6d3bd7] to-[#8b4bf0] hover:from-[#7c44ea] hover:to-[#9a5df7] text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_20px_rgba(109,59,215,0.4)] cursor-pointer border border-primary/40 select-none text-base"
        >
          <span className="tracking-wide">Registrar retirada</span>
          <span className="material-symbols-outlined text-lg font-bold">
            arrow_forward
          </span>
        </motion.button>
      </div>

      {/* Registrar Retirada Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            
            {/* Backdrop click closer */}
            <div className="absolute inset-0 cursor-default" onClick={() => !success && setShowModal(false)} />

            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full sm:max-w-md bg-[#131020]/98 border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-5 max-h-[92vh] overflow-y-auto contain-scroll z-10 text-left"
            >
              {/* Mobile Drag Handle */}
              <div className="w-12 h-1 bg-white/25 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0"></div>

              <AnimatePresence mode="wait">
                {!success ? (
                  <div className="flex flex-col gap-4 sm:gap-5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex flex-col">
                        <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>savings</span>
                          Nova Retirada
                        </h3>
                        <p className="text-xs text-zinc-400 font-medium">
                          Débito de pró-labore ou distribuição de lucros
                        </p>
                      </div>
                      <button 
                        onClick={() => setShowModal(false)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer select-none"
                        aria-label="Fechar modal"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                      
                      {/* Amount Input (Quanto foi?) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Quanto deseja retirar?</label>
                        <div className="relative flex items-center bg-black/40 border border-primary/50 rounded-2xl px-4 py-3 min-h-[50px] focus-within:shadow-[0_0_15px_rgba(160,120,255,0.25)] transition-all">
                          <span className="text-lg font-bold text-primary mr-2">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-transparent border-none text-white font-extrabold text-xl focus:outline-none placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>

                      {/* Finalidade (Categoria) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Finalidade</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Pró-labore', 'Distribuição', 'Reembolso', 'Outros'].map((cat) => {
                            const isSelected = category === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(cat)}
                                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                                  isSelected
                                    ? 'border-primary/50 bg-primary/20 text-primary shadow-sm'
                                    : 'border-white/5 bg-black/40 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Origin/Method */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Receber por onde?</label>
                        <div className="relative flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3 min-h-[48px] focus-within:border-primary transition-all">
                          <select
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer outline-none"
                          >
                            <option value="Pix" className="bg-[#131315] text-white">Pix pessoal</option>
                            <option value="Dinheiro" className="bg-[#131315] text-white">Dinheiro em espécie</option>
                            <option value="Transferência Bancária" className="bg-[#131315] text-white">Transferência PJ para PF</option>
                            <option value="Débito" className="bg-[#131315] text-white">Débito em conta</option>
                          </select>
                        </div>
                      </div>

                      {/* Descrição (opcional) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Descrição <span className="text-xs font-normal text-zinc-500">(opcional)</span></label>
                        <input
                          type="text"
                          placeholder="Ex.: retirada quinzenal de pró-labore..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 min-h-[48px] text-xs focus:outline-none focus:border-primary text-white placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Quando foi? */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Quando foi?</label>
                        <div className="relative flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3 min-h-[48px] focus-within:border-primary transition-all">
                          <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-white focus:outline-none scheme-dark"
                          />
                          <span className="material-symbols-outlined absolute right-4 text-zinc-500 pointer-events-none text-lg">calendar_today</span>
                        </div>
                      </div>

                      {/* Submit action */}
                      <button
                        type="submit"
                        className="w-full h-[52px] bg-gradient-to-r from-[#6d3bd7] to-[#8b4bf0] hover:from-[#7c44ea] hover:to-[#9a5df7] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_20px_rgba(109,59,215,0.4)] cursor-pointer border border-primary/40 mt-2 select-none"
                      >
                        <span className="material-symbols-outlined text-base font-bold">done</span>
                        <span className="text-sm font-extrabold">Salvar retirada</span>
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
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mb-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Retirada Registrada!</h3>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed font-medium">
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
