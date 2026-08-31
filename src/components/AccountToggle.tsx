import React from 'react';
import { motion } from 'motion/react';
import { AccountType } from '../types';

interface AccountToggleProps {
  activeAccount: AccountType;
  onAccountChange: (account: AccountType) => void;
  className?: string;
  size?: 'sm' | 'md';
  isPro?: boolean;
}

export default function AccountToggle({
  activeAccount,
  onAccountChange,
  className = '',
  size = 'md',
  isPro = false
}: AccountToggleProps) {
  const isSm = size === 'sm';

  return (
    <div
      className={`inline-flex items-center rounded-full bg-[#140f24]/90 backdrop-blur-xl border border-white/10 shadow-md relative select-none shrink-0 ${
        isSm ? 'p-0.5 w-[218px]' : 'p-1 w-[240px]'
      } ${className}`}
      role="tablist"
      aria-label="Alternar entre Conta Empresarial e Conta Pessoal"
    >
      {/* Botão Conta Empresarial */}
      <button
        type="button"
        role="tab"
        aria-selected={activeAccount === 'empresarial'}
        onClick={() => onAccountChange('empresarial')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer ${
          isSm
            ? 'py-1 text-[11px] min-h-[28px]'
            : 'py-1.5 text-xs min-h-[34px]'
        } ${
          activeAccount === 'empresarial'
            ? 'text-white font-extrabold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <span
          className={`material-symbols-outlined shrink-0 ${isSm ? 'text-xs' : 'text-sm'}`}
          style={{ fontVariationSettings: activeAccount === 'empresarial' ? "'FILL' 1" : "'FILL' 0" }}
        >
          domain
        </span>
        <span className="tracking-tight whitespace-nowrap">Empresa</span>
      </button>

      {/* Botão Conta Pessoal */}
      <button
        type="button"
        role="tab"
        aria-selected={activeAccount === 'pessoal'}
        onClick={() => onAccountChange('pessoal')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer ${
          isSm
            ? 'py-1 text-[11px] min-h-[28px]'
            : 'py-1.5 text-xs min-h-[34px]'
        } ${
          activeAccount === 'pessoal'
            ? 'text-white font-extrabold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <span
          className={`material-symbols-outlined shrink-0 ${isSm ? 'text-xs' : 'text-sm'}`}
          style={{ fontVariationSettings: activeAccount === 'pessoal' ? "'FILL' 1" : "'FILL' 0" }}
        >
          person
        </span>
        <span className="tracking-tight whitespace-nowrap">Pessoal</span>
        {!isPro && (
          <span 
            className="text-[8px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1 py-0.5 rounded font-black tracking-wider leading-none ml-0.5"
            title="Exclusivo MCO Completo"
          >
            PRO
          </span>
        )}
      </button>

      {/* Active Pill Indicator */}
      <motion.div
        animate={{ x: activeAccount === 'empresarial' ? '0%' : '100%' }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        className={`absolute rounded-full bg-gradient-to-r from-[#7C3AED] to-[#9333ea] shadow-[0_0_12px_rgba(124,58,237,0.5)] border border-[#c4b5fd]/40 pointer-events-none ${
          isSm ? 'top-0.5 bottom-0.5 left-0.5' : 'top-1 bottom-1 left-1'
        }`}
        style={{ width: isSm ? 'calc(50% - 2px)' : 'calc(50% - 4px)' }}
      />
    </div>
  );
}
