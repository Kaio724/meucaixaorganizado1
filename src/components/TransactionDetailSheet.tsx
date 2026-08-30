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
  Sparkles
} from 'lucide-react';
import { Transaction } from '../types';
import { getCategoryInfo } from '../lib/categories';
import { getPersonalCategoryInfo } from '../lib/personalCategories';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  userId?: string;
}

export default function TransactionDetailSheet({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  userId = 'default_user'
}: TransactionDetailSheetProps) {
  if (!isOpen || !transaction) return null;

  const isPersonal = transaction.accountType === 'pessoal';
  const catInfo = isPersonal
    ? getPersonalCategoryInfo(transaction.category, transaction.type, userId)
    : getCategoryInfo(transaction.category, transaction.type, userId);

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

              {/* Data */}
              <div className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="font-medium">Data</span>
                </div>
                <span className="font-semibold text-zinc-200 capitalize">
                  {formattedDate}
                </span>
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
                    <span className="font-medium">Observações</span>
                  </div>
                  <p className="text-zinc-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5 leading-relaxed">
                    {transaction.description}
                  </p>
                </div>
              )}

            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-white/5 bg-[#100c1c] flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10 active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Lançamento</span>
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

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
