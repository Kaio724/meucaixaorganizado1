import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';
import { getTodayDateStr } from '../lib/financialMath';

interface ConfirmSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onConfirm: (tx: Transaction, actualAmount: number, actualDate: string, observation?: string) => Promise<void> | void;
  onUnsettle?: (tx: Transaction) => Promise<void> | void;
}

export default function ConfirmSettlementModal({
  isOpen,
  onClose,
  transaction,
  onConfirm,
  onUnsettle,
}: ConfirmSettlementModalProps) {
  const [actualAmount, setActualAmount] = useState<string>('');
  const [actualDate, setActualDate] = useState<string>(getTodayDateStr());
  const [observation, setObservation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnsettling, setIsUnsettling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setActualAmount(String(transaction.amountPaid ?? transaction.amount));
      setActualDate(transaction.effectiveDate || getTodayDateStr());
      setObservation(transaction.observation || '');
      setErrorMsg(null);
      setIsSubmitting(false);
      setIsUnsettling(false);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const isEntrada = transaction.type === 'entrada';
  const isAlreadyRealized = transaction.status === 'realizado';
  const actionTitle = isEntrada ? 'Confirmar Recebimento' : 'Confirmar Pagamento';
  const dueDateStr = transaction.dueDate || transaction.date;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numVal = parseFloat(actualAmount.replace(',', '.'));
    if (isNaN(numVal) || numVal < 0) {
      setErrorMsg('Informe um valor válido e positivo.');
      return;
    }

    if (!actualDate) {
      setErrorMsg('Informe a data efetiva da movimentação.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onConfirm(transaction, numVal, actualDate, observation.trim() || undefined);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao registrar baixa. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const handleUnsettle = async () => {
    if (!onUnsettle || isUnsettling) return;
    if (!window.confirm('Deseja reabrir este lançamento como pendente? Ele sairá do caixa realizado.')) {
      return;
    }
    setIsUnsettling(true);
    try {
      await onUnsettle(transaction);
      onClose();
    } catch (err: any) {
      setErrorMsg('Erro ao desfazer baixa.');
      setIsUnsettling(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-[#18181c] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-left"
        >
          {/* Subtle glow accent */}
          <div
            className={`absolute -top-16 -right-16 w-40 h-40 rounded-full filter blur-3xl pointer-events-none ${
              isEntrada ? 'bg-[#10b981]/20' : 'bg-[#ef4444]/20'
            }`}
          />

          {/* Modal Header */}
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg ${
                  isEntrada
                    ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30 shadow-[#10b981]/15'
                    : 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30 shadow-[#ef4444]/15'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isEntrada ? 'check_circle' : 'receipt_long'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                  {isAlreadyRealized ? 'Ajustar Baixa' : 'Baixa de Lançamento'}
                </span>
                <h3 className="text-base font-extrabold text-on-surface leading-tight">
                  {actionTitle}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting || isUnsettling}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Transaction Summary Card */}
          <div className="bg-surface-container-low border border-white/5 rounded-2xl p-3.5 mb-4 relative z-10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-on-surface truncate max-w-[220px]">
                {transaction.title}
              </span>
              <span className="text-[11px] font-bold text-on-surface-variant bg-white/5 px-2 py-0.5 rounded-md">
                {transaction.category}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
              <span className="text-on-surface-variant">Valor Previsto:</span>
              <span className="font-bold text-on-surface">{formatBRL(transaction.amount)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-on-surface-variant">Vencimento Original:</span>
              <span className="font-bold text-on-surface">
                {dueDateStr
                  ? new Date(dueDateStr + 'T12:00:00').toLocaleDateString('pt-BR')
                  : 'Não especificado'}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-error/15 border border-error/30 rounded-xl text-error text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Settlement Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 relative z-10">
            {/* Real Amount Input */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                {isEntrada ? 'Valor Efetivamente Recebido (R$)' : 'Valor Efetivamente Pago (R$)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[#111115] border border-white/10 focus:border-primary rounded-xl py-2.5 pl-10 pr-3 text-sm font-bold text-on-surface outline-none transition-colors"
                />
              </div>
            </div>

            {/* Real Date Input */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                {isEntrada ? 'Data Real do Recebimento' : 'Data Real do Pagamento'}
              </label>
              <input
                type="date"
                required
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full bg-[#111115] border border-white/10 focus:border-primary rounded-xl py-2.5 px-3 text-sm font-bold text-on-surface outline-none transition-colors"
              />
              <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                O caixa realizado será impactado nesta data efetiva. O vencimento original permanece registrado.
              </span>
            </div>

            {/* Observation Notes */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Observações (Opcional)
              </label>
              <input
                type="text"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Recebido com desconto, comprovante pix #123, etc."
                className="w-full bg-[#111115] border border-white/10 focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface outline-none transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isUnsettling}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                  isEntrada
                    ? 'bg-[#10b981] hover:bg-[#059669] shadow-[#10b981]/25'
                    : 'bg-[#ef4444] hover:bg-[#dc2626] shadow-[#ef4444]/25'
                }`}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check</span>
                    {isAlreadyRealized ? 'Salvar Alterações' : actionTitle}
                  </>
                )}
              </button>

              {isAlreadyRealized && onUnsettle && (
                <button
                  type="button"
                  onClick={handleUnsettle}
                  disabled={isSubmitting || isUnsettling}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-on-surface-variant hover:text-amber-400 hover:bg-amber-400/10 border border-white/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">undo</span>
                  Desfazer confirmação (Voltar para Pendente)
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
