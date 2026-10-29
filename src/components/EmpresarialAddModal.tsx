import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Transaction, 
  TransactionType, 
  ExpenseType, 
  RevenueType, 
  RecurrenceFrequency 
} from '../types';
import { PAYMENT_METHODS } from '../initialData';
import { getCategoryNamesByType, getCategoryInfo } from '../lib/categories';
import { 
  buildRecurringRevenueTransactions, 
  buildRecurringExpenseTransactions 
} from '../lib/revenueRecurrence';
import { saveConta } from '../lib/contasData';
import { getTodayDateStr } from '../lib/financialMath';

interface EmpresarialAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void> | void;
  userId?: string;
  defaultType?: TransactionType;
}

export default function EmpresarialAddModal({
  isOpen,
  onClose,
  onAddTransaction,
  userId = 'default_user',
  defaultType = 'entrada'
}: EmpresarialAddModalProps) {
  const [txType, setTxType] = useState<TransactionType>(defaultType);
  const [expenseType, setExpenseType] = useState<ExpenseType>('variavel');
  const [revenueType, setRevenueType] = useState<RevenueType>('variavel');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate] = useState(getTodayDateStr());
  const [dueDate, setDueDate] = useState('');
  const [observacao, setObservacao] = useState('');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('mensal');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(10);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTxType(defaultType);
      setExpenseType('variavel');
      setRevenueType('variavel');
      setTitle('');
      setAmount('');
      const cats = getCategoryNamesByType(userId, defaultType);
      setCategory(cats[0] || 'Outros');
      setPaymentMethod('Pix');
      setDate(getTodayDateStr());
      setDueDate('');
      setObservacao('');
      setRecurrenceFrequency('mensal');
      setRecurrenceDay(new Date().getDate());
      setRecurrenceEndDate('');
      setValidationError('');
      setIsSubmitting(false);

      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, defaultType, userId]);

  useEffect(() => {
    const cats = getCategoryNamesByType(userId, txType);
    setCategory(cats[0] || 'Outros');
  }, [txType, userId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const parsedAmount = Math.abs(parseFloat(amount.replace(',', '.')));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Informe um valor válido maior que zero.');
      return;
    }

    const isFixedRevenue = txType === 'entrada' && revenueType === 'fixa';
    const isFixedExpense = txType === 'saida' && expenseType === 'fixa';

    if (isFixedRevenue || isFixedExpense) {
      if (!recurrenceEndDate) {
        setValidationError('A data de término da recorrência é obrigatória.');
        return;
      }
      if (recurrenceEndDate < date) {
        setValidationError('A data de término deve ser igual ou posterior à data de início.');
        return;
      }
    }

    setValidationError('');
    setIsSubmitting(true);

    try {
      if (isFixedRevenue) {
        const recurringTxs = buildRecurringRevenueTransactions({
          title: title.trim() || category || 'Receita Fixa Recorrente',
          amount: parsedAmount,
          category,
          paymentMethod,
          description: observacao.trim() || undefined,
          accountType: 'empresarial',
          frequency: recurrenceFrequency,
          day: recurrenceDay,
          startDate: date,
          endDate: recurrenceEndDate,
        });

        for (const rTx of recurringTxs) {
          await onAddTransaction(rTx);
        }
      } else if (isFixedExpense) {
        const recurringTxs = buildRecurringExpenseTransactions({
          title: title.trim() || category || 'Conta Fixa Recorrente',
          amount: parsedAmount,
          category,
          paymentMethod,
          description: observacao.trim() || undefined,
          accountType: 'empresarial',
          frequency: recurrenceFrequency,
          day: recurrenceDay,
          startDate: date,
          endDate: recurrenceEndDate,
        });

        for (const rTx of recurringTxs) {
          await onAddTransaction(rTx);
        }

        try {
          await saveConta(userId || 'default_user', {
            nome: title.trim() || category || 'Conta Fixa',
            valor: parsedAmount,
            tipo: 'fixa',
            categoria: category || 'Outros',
            frequencia: recurrenceFrequency,
            diaVencimento: recurrenceDay,
            dataInicio: date,
            dataTermino: recurrenceEndDate,
            observacao: observacao.trim() || undefined,
            ativa: true,
            accountType: 'empresarial'
          });
        } catch (err) {
          console.warn('Erro ao salvar conta de referência:', err);
        }
      } else {
        const isFutureDate = date > getTodayDateStr();
        await onAddTransaction({
          title: title.trim() || category || (txType === 'entrada' ? 'Receita Empresarial' : 'Despesa Empresarial'),
          amount: parsedAmount,
          type: txType,
          category: category || 'Outros',
          paymentMethod,
          date,
          dueDate: dueDate || (isFutureDate ? date : undefined),
          effectiveDate: isFutureDate ? undefined : date,
          status: isFutureDate ? 'pendente' : 'realizado',
          accountType: 'empresarial',
          revenueType: txType === 'entrada' ? revenueType : undefined,
          expenseType: txType === 'saida' ? expenseType : undefined,
          description: observacao.trim() || undefined,
        });
      }

      onClose();
    } catch (err) {
      console.error('Erro ao adicionar movimentação:', err);
      setValidationError('Erro ao salvar o lançamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = getCategoryNamesByType(userId, txType);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#161224] border-t sm:border border-primary/25 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden text-left"
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(208,188,255,0.2)]">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  add_circle
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/80">
                  Empresa • Lançar Caixa
                </span>
                <h3 className="text-base font-black text-white">
                  Nova Movimentação
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Form scroll container */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex flex-col gap-4">
            {/* Validation alert */}
            {validationError && (
              <div className="p-3 bg-error/15 border border-error/30 rounded-xl text-xs font-bold text-rose-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Type selector: Entrada vs Saída */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/10 gap-1.5 select-none h-12">
              <button
                type="button"
                onClick={() => setTxType('entrada')}
                className={`h-full rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  txType === 'entrada'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base font-bold">arrow_downward</span>
                <span>Receita (Entrou)</span>
              </button>

              <button
                type="button"
                onClick={() => setTxType('saida')}
                className={`h-full rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  txType === 'saida'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 border border-rose-400/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base font-bold">arrow_upward</span>
                <span>Despesa (Saiu)</span>
              </button>
            </div>

            {/* Subclassification */}
            {txType === 'entrada' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Classificação da Receita
                </label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/5 gap-1 select-none h-10">
                  <button
                    type="button"
                    onClick={() => setRevenueType('variavel')}
                    className={`h-full px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      revenueType === 'variavel'
                        ? 'bg-sky-500 text-white shadow-sm border border-sky-400/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>Variável (Venda)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevenueType('fixa')}
                    className={`h-full px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      revenueType === 'fixa'
                        ? 'bg-emerald-600 text-white shadow-sm border border-emerald-400/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>Fixa (Contrato/Recorrência)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Classificação da Despesa
                </label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/5 gap-1 select-none h-10">
                  <button
                    type="button"
                    onClick={() => setExpenseType('variavel')}
                    className={`h-full px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      expenseType === 'variavel'
                        ? 'bg-amber-500 text-white shadow-sm border border-amber-400/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    <span>Variável</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType('fixa')}
                    className={`h-full px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      expenseType === 'fixa'
                        ? 'bg-primary text-white shadow-sm border border-primary/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span>Fixa (Mensal)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Valor do Lançamento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                Valor (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">
                  R$
                </span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full bg-[#1b162b] border rounded-2xl pl-12 pr-4 min-h-[50px] py-3 text-2xl font-black text-white placeholder:text-zinc-600 focus:outline-none transition-all ${
                    txType === 'entrada'
                      ? 'border-emerald-500/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50'
                      : 'border-rose-500/30 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/50'
                  }`}
                />
              </div>
            </div>

            {/* Descrição / Título */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                Descrição do Lançamento *
              </label>
              <input
                type="text"
                required
                placeholder={
                  txType === 'entrada'
                    ? 'Ex: Serviço de Consultoria, Venda de Produto...'
                    : 'Ex: Aluguel, Fornecedor X, DAS MEI...'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#1b162b] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Categoria & Forma de Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#1b162b] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer truncate"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#1b162b] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[#1b162b] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm} className="bg-[#1b162b] text-white">
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data do Lançamento / Vencimento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#1b162b] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Vencimento (Opcional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="Se for a prazo"
                  className="w-full bg-[#1b162b] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Recorrência quando Fixa */}
            {((txType === 'entrada' && revenueType === 'fixa') || (txType === 'saida' && expenseType === 'fixa')) && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-primary/20 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">autorenew</span>
                  <span>Configuração de Recorrência Mensal</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Frequência</label>
                    <select
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                      className="bg-[#181426] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="mensal">Mensal</option>
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Até quando? *</label>
                    <input
                      type="date"
                      required
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="bg-[#181426] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Observação (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes adicionais, número de nota fiscal, fornecedor..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full bg-[#1b162b] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-[#9333ea] hover:from-[#b99bfe] hover:to-[#a855f7] text-[#13111e] font-black text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(208,188,255,0.3)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#13111e] border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg font-bold">check</span>
                    <span>Confirmar Lançamento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
