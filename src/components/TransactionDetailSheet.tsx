import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  CreditCard, 
  Tag, 
  Building2, 
  User, 
  FileText, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Transaction } from '../types';
import { getCategoryInfo } from '../lib/categories';
import { getPersonalCategoryInfo } from '../lib/personalCategories';
import { getTransactionDueStatus, isTransactionRealized, getTodayDateStr } from '../lib/financialMath';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenSettlement?: (tx: Transaction) => void;
  userId?: string;
}

export default function TransactionDetailSheet({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenSettlement,
  userId = 'default_user'
}: TransactionDetailSheetProps) {
  if (!isOpen || !transaction) return null;

  const isPersonal = transaction.accountType === 'pessoal';
  const catInfo = isPersonal
    ? getPersonalCategoryInfo(transaction.category, transaction.type, userId)
    : getCategoryInfo(transaction.category, transaction.type, userId);

  const isRealized = isTransactionRealized(transaction);
  const dueStatus = getTransactionDueStatus(transaction, getTodayDateStr());

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formattedDate = transaction.date
    ? new Date(transaction.date + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : 'Data não informada';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
        {/* Backdrop dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />

        {/* Sheet Content */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-lg bg-[#141022] border-t sm:border border-white/10 sm:rounded-[32px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2 sm:hidden shrink-0" />

          {/* Header */}
          <div className="px-6 pt-3 pb-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                isPersonal 
                  ? 'bg-[#7C3AED]/20 text-[#c4b5fd] border-[#7C3AED]/35' 
                  : 'bg-primary/20 text-primary border-primary/35'
              }`}>
                {isPersonal ? 'Conta Pessoal' : 'Conta Empresarial'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                transaction.type === 'entrada'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}>
                {transaction.type === 'entrada' ? 'Receita' : 'Despesa'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex flex-col gap-6 text-left">
            
            {/* Protagonist Value & Title */}
            <div className="flex flex-col gap-1.5 text-center items-center py-2">
              <span className="text-xs text-zinc-400 font-medium tracking-wide">
                Valor do Lançamento
              </span>
              <h2 className={`text-4xl sm:text-[42px] font-extrabold tracking-tight ${
                transaction.type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {transaction.type === 'entrada' ? '+' : '-'} {formatBRL(transaction.amount)}
              </h2>
              <p className="text-base font-bold text-white mt-1 max-w-sm text-center">
                {transaction.title}
              </p>
            </div>

            {/* Structured Detail Grid */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col divide-y divide-white/5">
              
              {/* Status Financeiro */}
              <div className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span className="font-medium">Situação</span>
                </div>
                <div>
                  {dueStatus === 'atrasado' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Em atraso
                    </span>
                  )}
                  {dueStatus === 'vence_hoje' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Clock className="w-3.5 h-3.5" />
                      Vence hoje
                    </span>
                  )}
                  {dueStatus === 'a_vencer' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/35">
                      <Clock className="w-3.5 h-3.5" />
                      A vencer (Previsto)
                    </span>
                  )}
                  {dueStatus === 'recebido' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Recebido (Realizado)
                    </span>
                  )}
                  {dueStatus === 'pago' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500/35">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pago (Realizado)
                    </span>
                  )}
                </div>
              </div>

              {/* Data de Vencimento */}
              <div className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="font-medium">Data de Vencimento</span>
                </div>
                <span className="font-bold text-zinc-200">
                  {(transaction.dueDate || transaction.date).split('-').reverse().join('/')}
                </span>
              </div>

              {/* Data Efetiva de Pagamento / Recebimento */}
              {isRealized && transaction.effectiveDate && (
                <div className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium">Data Efetiva da Baixa</span>
                  </div>
                  <span className="font-bold text-emerald-300">
                    {transaction.effectiveDate.split('-').reverse().join('/')}
                  </span>
                </div>
              )}

              {/* Valor Efetivamente Pago / Recebido (se diferente) */}
              {isRealized && transaction.amountPaid !== undefined && transaction.amountPaid !== transaction.amount && (
                <div className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Receipt className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">Valor Efetivado</span>
                  </div>
                  <span className="font-extrabold text-white">
                    {formatBRL(transaction.amountPaid)}
                  </span>
                </div>
              )}

              {/* Categoria */}
              <div className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Tag className="w-4 h-4 text-zinc-500" />
                  <span className="font-medium">Categoria</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span className={`w-2 h-2 rounded-full ${catInfo.color.replace('text-', 'bg-') || 'bg-primary'}`} />
                  <span>{transaction.category}</span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <CreditCard className="w-4 h-4 text-zinc-500" />
                  <span className="font-medium">Forma de Pagamento</span>
                </div>
                <span className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  {transaction.paymentMethod || 'Pix'}
                </span>
              </div>

              {/* Classificação da Receita (Fixa ou Variável) */}
              {transaction.type === 'entrada' && (
                <div className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Receipt className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">Classificação</span>
                  </div>
                  <span className={`font-extrabold px-2.5 py-1 rounded-lg border uppercase text-[10px] tracking-wider ${
                    transaction.revenueType === 'fixa'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  }`}>
                    {transaction.revenueType === 'fixa' ? 'Receita Fixa' : 'Receita Variável'}
                  </span>
                </div>
              )}

              {/* Informações de Recorrência para Receita Fixa */}
              {transaction.type === 'entrada' && transaction.revenueType === 'fixa' && (
                <>
                  {transaction.recurrenceFrequency && (
                    <div className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium">Frequência</span>
                      </div>
                      <span className="font-bold text-white capitalize bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        {transaction.recurrenceFrequency}
                      </span>
                    </div>
                  )}

                  {transaction.recurrenceDay !== undefined && (
                    <div className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium">Dia de Recebimento</span>
                      </div>
                      <span className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        Todo dia {transaction.recurrenceDay}
                      </span>
                    </div>
                  )}

                  {transaction.recurrenceStartDate && (
                    <div className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium">Vigência</span>
                      </div>
                      <span className="font-medium text-zinc-300">
                        {transaction.recurrenceEndDate
                          ? `${transaction.recurrenceStartDate.split('-').reverse().join('/')} até ${transaction.recurrenceEndDate.split('-').reverse().join('/')}`
                          : `A partir de ${transaction.recurrenceStartDate.split('-').reverse().join('/')}`}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Classificação da Despesa (Fixa ou Variável) */}
              {transaction.type === 'saida' && (
                <div className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Receipt className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">Classificação</span>
                  </div>
                  <span className={`font-extrabold px-2.5 py-1 rounded-lg border uppercase text-[10px] tracking-wider ${
                    transaction.expenseType === 'fixa'
                      ? 'bg-purple-500/20 text-[#c4b5fd] border-purple-500/35'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {transaction.expenseType === 'fixa' ? 'Conta Fixa' : 'Conta Variável'}
                  </span>
                </div>
              )}

              {/* Informações de Recorrência para Despesa Fixa */}
              {transaction.type === 'saida' && transaction.expenseType === 'fixa' && (
                <>
                  {transaction.recurrenceFrequency && (
                    <div className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium">Frequência</span>
                      </div>
                      <span className="font-bold text-white capitalize bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        {transaction.recurrenceFrequency}
                      </span>
                    </div>
                  )}

                  {transaction.recurrenceDay !== undefined && (
                    <div className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium">Dia do Vencimento</span>
                      </div>
                      <span className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        Todo dia {transaction.recurrenceDay}
                      </span>
                    </div>
                  )}

                  {transaction.recurrenceStartDate && (
                    <div className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium">Vigência</span>
                      </div>
                      <span className="font-medium text-zinc-300">
                        {transaction.recurrenceEndDate
                          ? `${transaction.recurrenceStartDate.split('-').reverse().join('/')} até ${transaction.recurrenceEndDate.split('-').reverse().join('/')}`
                          : `A partir de ${transaction.recurrenceStartDate.split('-').reverse().join('/')}`}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Conta / Destino se houver */}
              {transaction.account && (
                <div className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">Conta</span>
                  </div>
                  <span className="font-semibold text-zinc-300">
                    {transaction.account}
                  </span>
                </div>
              )}

              {/* Observação / Descrição se houver */}
              {transaction.description && (
                <div className="py-3 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">Descrição</span>
                  </div>
                  <p className="text-zinc-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5 leading-relaxed">
                    {transaction.description}
                  </p>
                </div>
              )}

              {/* Observações da Baixa */}
              {transaction.observation && (
                <div className="py-3 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-emerald-300">Observação da Baixa</span>
                  </div>
                  <p className="text-zinc-200 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 leading-relaxed font-medium">
                    {transaction.observation}
                  </p>
                </div>
              )}

            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-white/5 bg-[#100c1c] flex flex-col sm:flex-row items-center gap-2.5">
            {onOpenSettlement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettlement(transaction);
                }}
                className={`w-full sm:flex-1 h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                  isRealized
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    : transaction.type === 'entrada'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isRealized
                    ? 'Ver / Ajustar Baixa'
                    : transaction.type === 'entrada'
                      ? 'Confirmar Recebimento'
                      : 'Confirmar Pagamento'}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  onClose();
                  onEdit(transaction);
                }}
                className="flex-1 sm:flex-initial h-12 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10 active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onDelete(transaction.id);
                }}
                className="h-12 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-rose-500/20 active:scale-95"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
