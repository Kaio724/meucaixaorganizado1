import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface UpgradeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function UpgradeSuccessModal({ isOpen, onClose, userName }: UpgradeSuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire celebratory confetti bursts
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#a078ff', '#d0bcff', '#4edea3', '#ffffff']
        });
        const timeout = setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#a078ff', '#4edea3', '#ffd700']
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#a078ff', '#4edea3', '#ffd700']
          });
        }, 250);
        return () => clearTimeout(timeout);
      } catch (e) {
        // Safe fail
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg bg-[#18171b] border border-primary/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] z-10 overflow-hidden text-center my-auto"
        >
          {/* Ambient Purple Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#7C3AED]/15 rounded-full filter blur-3xl pointer-events-none" />

          {/* Close 'X' Button - Required: Deve ter um X para fechar e voltar para a dashboard */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer group z-20"
            title="Fechar e voltar para a dashboard"
            aria-label="Fechar e voltar para a dashboard"
          >
            <span className="material-symbols-outlined text-lg transition-transform group-hover:scale-110">close</span>
          </button>

          {/* Badge & Crown Icon */}
          <div className="flex flex-col items-center gap-3 mt-1">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#a078ff] flex items-center justify-center shadow-[0_0_30px_rgba(160,120,255,0.45)] ring-4 ring-primary/20">
                <span className="material-symbols-outlined text-3xl text-white">workspace_premium</span>
              </div>
              <div className="absolute -bottom-2 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px] leading-none">check_circle</span>
                <span>Ativado</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase mt-2">
              <span className="material-symbols-outlined text-xs">auto_awesome</span>
              <span>Upgrade para MCO Completo</span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight mt-1">
              Parabéns{userName ? `, ${userName}` : ''}! 🎉
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-md">
              Seu upgrade foi realizado com sucesso! Agora você possui o <strong className="text-primary font-bold">MCO Completo vitalício</strong> com todos os recursos e inteligência financeira desbloqueados.
            </p>
          </div>

          {/* Unlocked Features List */}
          <div className="mt-5 p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2.5 text-left">
            <span className="text-[10px] font-black text-primary/90 tracking-wider uppercase">
              Recursos liberados na sua conta:
            </span>

            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="material-symbols-outlined text-emerald-400 text-base shrink-0 mt-0.5">account_balance</span>
              <div>
                <span className="font-bold text-white">Gestão Dupla Integrada:</span> Alterne a qualquer momento entre sua <span className="text-primary font-medium">Conta Empresarial (PJ)</span> e sua <span className="text-primary font-medium">Conta Pessoal (PF)</span> na barra superior.
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="material-symbols-outlined text-emerald-400 text-base shrink-0 mt-0.5">query_stats</span>
              <div>
                <span className="font-bold text-white">Comparativo Financeiro entre Meses:</span> Gráficos e inteligência de faturamento na aba Resumo.
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="material-symbols-outlined text-emerald-400 text-base shrink-0 mt-0.5">track_changes</span>
              <div>
                <span className="font-bold text-white">Metas & Orçamentos Mensais:</span> Acompanhe seu limite de gastos e saúde financeira.
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="material-symbols-outlined text-emerald-400 text-base shrink-0 mt-0.5">bolt</span>
              <div>
                <span className="font-bold text-white">Importação com IA Turbinada:</span> 50 créditos mensais para importar e categorizar seus extratos.
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="material-symbols-outlined text-emerald-400 text-base shrink-0 mt-0.5">all_inclusive</span>
              <div>
                <span className="font-bold text-white">Acesso Vitalício:</span> Sem nenhuma mensalidade ou cobrança recorrente futura.
              </div>
            </div>
          </div>

          {/* Action Button: Voltar para a Dashboard */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] hover:from-[#8b4bf0] hover:to-[#a855f7] active:scale-[0.99] border border-primary/30 shadow-[0_4px_20px_rgba(124,58,237,0.45)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.65)] transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
            >
              <span className="material-symbols-outlined text-base">dashboard</span>
              <span>Voltar para a Dashboard</span>
            </button>
            <span className="text-[10px] text-zinc-500 font-medium">
              Você pode fechar a qualquer momento clicando no botão acima ou no X.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
