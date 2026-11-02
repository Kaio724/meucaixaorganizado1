import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  BrainCircuit, 
  CalendarClock,
  Lock
} from 'lucide-react';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPlans: () => void;
}

export default function TrialExpiredModal({
  isOpen,
  onClose,
  onViewPlans,
}: TrialExpiredModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#141022] border border-primary/30 rounded-[32px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden text-center flex flex-col gap-6"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6d3bd7] to-[#a855f7] flex items-center justify-center text-white shadow-[0_0_25px_rgba(109,59,215,0.6)] border border-white/20">
            <Sparkles className="w-8 h-8" />
          </div>

          {/* Title & Headline */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
              Demonstração Concluída
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              E aí, o que achou do MCO?
            </h2>
            <p className="text-base font-bold text-zinc-200">
              Seu período de teste chegou ao fim!
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              Esperamos que você tenha gostado da experiência. Agora você pode assinar o plano definitivo para continuar aproveitando todos os recursos sem limites.
            </p>
          </div>

          {/* Safety & Data Preservation Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-300">
                Seus lançamentos estão 100% seguros
              </h4>
              <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                Nenhum dado cadastrado foi excluído. Todas as suas movimentações e categorias permanecem salvas na sua conta.
              </p>
            </div>
          </div>

          {/* What unlocks with MCO PRO */}
          <div className="flex flex-col gap-2 text-left bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
              Recursos do MCO Completo que você experimentou:
            </span>

            <div className="flex items-center gap-2.5 text-xs text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span><strong>Conta Dupla:</strong> Gestão separada para Empresa e Pessoal</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span><strong>Relatórios com IA:</strong> Assistente inteligente 24h no Gemini</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span><strong>Previsões Financeiras:</strong> Contas a pagar, a receber e baixas</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={() => {
                onClose();
                onViewPlans();
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6d3bd7] to-[#9333ea] hover:from-[#7C3AED] hover:to-[#a855f7] text-white font-extrabold text-sm shadow-[0_8px_24px_rgba(109,59,215,0.4)] border border-primary/40 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Ver Planos e Assinar MCO</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Continuar com Recursos Básicos
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
