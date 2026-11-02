import React from 'react';
import { motion } from 'motion/react';
import { Clock, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { formatRemainingTime } from '../lib/trialClient';

interface TrialCountdownBannerProps {
  remainingSeconds: number;
  durationMinutes?: number;
  onViewPlans: () => void;
}

export default function TrialCountdownBanner({
  remainingSeconds,
  durationMinutes,
  onViewPlans,
}: TrialCountdownBannerProps) {
  const isUrgent = remainingSeconds <= 300; // 5 minutes or less
  const formattedTime = formatRemainingTime(remainingSeconds);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`w-full py-2 px-3 sm:px-6 border-b text-xs flex items-center justify-between transition-colors z-40 backdrop-blur-md ${
        isUrgent
          ? 'bg-gradient-to-r from-rose-950/80 via-red-900/60 to-rose-950/80 border-rose-500/30 text-rose-200 shadow-[0_4px_20px_rgba(244,63,94,0.15)]'
          : 'bg-gradient-to-r from-[#1c1438]/90 via-[#25194d]/85 to-[#1c1438]/90 border-primary/25 text-primary-light shadow-[0_4px_20px_rgba(109,59,215,0.15)]'
      }`}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        {/* Left: Indicator & Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
            isUrgent 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
              : 'bg-primary/20 border-primary/40 text-primary animate-pulse'
          }`}>
            <Clock className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold uppercase tracking-wider text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md bg-white/10 text-white border border-white/10">
              Período de Teste
            </span>

            <span className="text-zinc-200 font-medium hidden sm:inline text-xs">
              Você está testando o <strong>MCO Completo</strong>:
            </span>

            <div className={`font-mono font-black text-sm tracking-tight px-2 py-0.5 rounded-lg border ${
              isUrgent
                ? 'bg-rose-500/30 text-white border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'bg-primary/25 text-white border-primary/40 shadow-[0_0_12px_rgba(160,120,255,0.3)]'
            }`}>
              {formattedTime}
            </div>
            
            <span className="text-[11px] text-zinc-400 hidden md:inline">
              (tempo corrido oficial)
            </span>
          </div>
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onViewPlans}
            className={`cursor-pointer px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
              isUrgent
                ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/30'
                : 'bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8B5CF6] hover:to-[#A855F7] text-white shadow-[#7C3AED]/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Assinar Agora</span>
            <ChevronRight className="w-3 h-3 hidden sm:inline" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
