import React from 'react';
import { motion } from 'motion/react';
import { AccountType } from '../types';

interface AccountToggleProps {
  activeAccount: AccountType;
  onAccountChange: (account: AccountType) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function AccountToggle({
  activeAccount,
  onAccountChange,
  className = '',
  size = 'md'
}: AccountToggleProps) {
  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-[#0f0b1f]/90 backdrop-blur-xl border border-primary/25 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative select-none w-full max-w-[220px] ${className}`}
      role="tablist"
      aria-label="Alternar entre Conta Empresarial e Conta Pessoal"
    >
      {/* Botão Conta Empresarial */}
      <button
        type="button"
        role="tab"
        aria-selected={activeAccount === 'empresarial'}
        onClick={() => onAccountChange('empresarial')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer min-h-[38px] sm:min-h-[40px] ${
          size === 'sm'
            ? 'px-2.5 py-1.5 text-[12px] sm:text-[13px]'
            : 'px-3 py-2 text-xs sm:text-[13px]'
        } ${
          activeAccount === 'empresarial'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <span
          className="material-symbols-outlined text-[16px] sm:text-[18px] shrink-0"
          style={{ fontVariationSettings: activeAccount === 'empresarial' ? "'FILL' 1" : "'FILL' 0" }}
        >
          domain
        </span>
        <span className="tracking-tight whitespace-nowrap">Empresarial</span>
      </button>

      {/* Botão Conta Pessoal */}
      <button
        type="button"
        role="tab"
        aria-selected={activeAccount === 'pessoal'}
        onClick={() => onAccountChange('pessoal')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer min-h-[38px] sm:min-h-[40px] ${
          size === 'sm'
            ? 'px-2.5 py-1.5 text-[12px] sm:text-[13px]'
            : 'px-3 py-2 text-xs sm:text-[13px]'
        } ${
          activeAccount === 'pessoal'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <span
          className="material-symbols-outlined text-[16px] sm:text-[18px] shrink-0"
          style={{ fontVariationSettings: activeAccount === 'pessoal' ? "'FILL' 1" : "'FILL' 0" }}
        >
          account_circle
        </span>
        <span className="tracking-tight whitespace-nowrap">Pessoal</span>
      </button>

      {/* Active Pill Indicator */}
      <motion.div
        animate={{ x: activeAccount === 'empresarial' ? '0%' : '100%' }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        className="absolute top-1 bottom-1 left-1 rounded-full bg-[#7C3AED] shadow-[0_0_16px_rgba(124,58,237,0.6)] border border-[#9d68f7]/40 pointer-events-none"
        style={{ width: 'calc(50% - 4px)' }}
      />
    </div>
  );
}
