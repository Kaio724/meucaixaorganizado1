import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { buildWhatsAppHireLink, recordHiringIntent } from '../lib/whatsappService';
import { requestTrialAccountDeletion } from '../lib/trialClient';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onViewPlans?: () => void;
  userEmail?: string;
  userId?: string;
  userToken?: string;
  onAccountDeleted?: () => void;
}

export default function TrialExpiredModal({
  isOpen,
  onClose,
  onViewPlans,
  userEmail,
  userId,
  userToken,
  onAccountDeleted,
}: TrialExpiredModalProps) {
  const [view, setView] = useState<'options' | 'confirm_delete'>('options');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleHireWhatsApp = (planName: 'Essencial' | 'MCO Completo', price: string) => {
    recordHiringIntent(planName, userEmail);
    const { url } = buildWhatsAppHireLink({
      planName,
      userEmail,
      price
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmDeleteAccount = async () => {
    if (!userId || !userEmail) {
      setDeleteError('Identificação do usuário indisponível. Tente novamente mais tarde.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await requestTrialAccountDeletion(userId, userEmail, userToken);
      if (res.success) {
        if (onAccountDeleted) {
          onAccountDeleted();
        } else if (onClose) {
          onClose();
        }
      } else {
        setDeleteError(res.message || 'Não foi possível concluir a exclusão da conta.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Erro inesperado na conexão ao excluir conta.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-2xl bg-[#141022] border border-primary/30 rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden my-auto"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          {view === 'options' ? (
            /* VIEW 1: Continuar com MCO (Opções de Planos com WhatsApp) ou Não Quero Continuar */
            <div className="flex flex-col gap-6 text-center">
              {/* Header Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6d3bd7] to-[#a855f7] flex items-center justify-center text-white shadow-[0_0_25px_rgba(109,59,215,0.6)] border border-white/20">
                <Sparkles className="w-8 h-8" />
              </div>

              {/* Title & Headline */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                  Período de Demonstração Concluído
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                  E aí, o que achou do MCO?
                </h2>
                <p className="text-sm sm:text-base font-bold text-zinc-200">
                  Seu período de teste chegou ao fim!
                </p>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Para continuar utilizando o Meu Caixa Organizado sem limites e manter seus lançamentos, escolha o plano ideal abaixo e solicite sua liberação direta pelo WhatsApp:
                </p>
              </div>

              {/* Safety notice */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">
                    Seus lançamentos estão salvos
                  </h4>
                  <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Nenhum dado cadastrado foi perdido. Ao ativar seu plano, todos os seus dados continuam prontos para uso.
                  </p>
                </div>
              </div>

              {/* Plan Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {/* Plano Essencial */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-white/20 transition-all">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Entrada
                      </span>
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Vitalício
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">MCO Essencial</h3>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-black text-white tracking-tight">R$ 27,90</span>
                        <span className="text-[11px] text-zinc-400 font-medium">pagamento único</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Fluxo de caixa prático para autônomos e pequenos empreendedores.
                    </p>

                    <div className="flex flex-col gap-1.5 pt-1">
                      {[
                        'Dashboard e fluxo de caixa',
                        'Histórico completo de transações',
                        'Categorias personalizadas',
                        'Relatórios financeiros',
                        'Acesso vitalício sem mensalidades'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleHireWhatsApp('Essencial', 'R$ 27,90')}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Contratar Essencial (R$ 27,90)</span>
                  </button>
                </div>

                {/* Plano MCO Completo */}
                <div className="rounded-2xl bg-gradient-to-b from-primary/15 to-primary/5 border border-primary/40 p-4 sm:p-5 flex flex-col justify-between gap-4 relative overflow-hidden shadow-[0_0_30px_rgba(109,59,215,0.2)] hover:border-primary/60 transition-all">
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-black text-[9px] font-black uppercase px-3 py-0.5 rounded-bl-xl tracking-wider">
                    Recomendado
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                        Mais Completo
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mr-16 sm:mr-14">
                        Vitalício
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">MCO Completo</h3>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-black text-primary tracking-tight">R$ 47,00</span>
                        <span className="text-[11px] text-zinc-400 font-medium">pagamento único</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Gestão completa com inteligência artificial e controle duplo integrado.
                    </p>

                    <div className="flex flex-col gap-1.5 pt-1">
                      {[
                        'Tudo do MCO Essencial',
                        'Conta Pessoal & Gestão Dupla (PF + PJ)',
                        'Relatórios com IA 24h no Gemini',
                        'Previsão de contas a pagar e receber',
                        'Metas financeiras e limites de orçamentos',
                        'Atualizações vitalícias sem mensalidades'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleHireWhatsApp('MCO Completo', 'R$ 47,00')}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#6d3bd7] to-[#9333ea] hover:from-[#7C3AED] hover:to-[#a855f7] text-white font-extrabold text-xs shadow-[0_6px_20px_rgba(109,59,215,0.4)] border border-primary/40 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Contratar Completo (R$ 47,00)</span>
                  </button>
                </div>
              </div>

              {/* Secondary Options */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
                {onViewPlans && (
                  <button
                    onClick={onViewPlans}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span>Comparar detalhes dos planos</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                )}

                {/* Opção B: Não quero continuar utilizando o MCO */}
                <button
                  type="button"
                  onClick={() => setView('confirm_delete')}
                  className="text-xs text-rose-400/90 hover:text-rose-300 underline underline-offset-4 font-medium py-1 px-2 transition-colors cursor-pointer ml-auto"
                >
                  Não quero continuar utilizando o MCO
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 2: Janela de Confirmação de Exclusão de Conta */
            <div className="flex flex-col gap-6 text-center max-w-lg mx-auto py-2">
              {/* Alert Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-8 h-8" />
              </div>

              {/* Title & Message as specified by prompt */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">
                  Confirmação de Exclusão
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                  Tem certeza de que deseja excluir sua conta?
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                  Ao confirmar, sua conta e os dados associados ao seu acesso de teste serão excluídos. Essa ação não poderá ser desfeita.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-left">
                  {deleteError}
                </div>
              )}

              {/* Action Buttons: Voltar & Sim, quero excluir minha conta */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setView('options');
                    setDeleteError(null);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteAccount}
                  className="flex-1 py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-xs shadow-[0_4px_16px_rgba(244,63,94,0.4)] border border-rose-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Excluindo conta...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sim, quero excluir minha conta</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
