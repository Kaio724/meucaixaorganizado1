import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';

interface MonthComparisonProps {
  transactions: Transaction[];
}

export default function MonthComparison({ transactions }: MonthComparisonProps) {
  const [activeView, setActiveView] = useState<'comparativo' | 'atual' | 'anterior'>('comparativo');

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const getMonthName = (monthOffset: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthOffset);
    const name = date.toLocaleString('pt-BR', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  const currentMonthName = getMonthName(0);
  const prevMonthName = getMonthName(1);

  // Filter transactions
  const currentTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  const prevTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
  });

  // Calculations Current
  const currentReceita = currentTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentDespesas = currentTxs
    .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentLucro = currentReceita - currentDespesas;

  // Calculations Previous
  const prevReceita = prevTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevDespesas = prevTxs
    .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevLucro = prevReceita - prevDespesas;

  // Variations
  const calculateVar = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const varReceita = calculateVar(currentReceita, prevReceita);
  const varDespesas = calculateVar(currentDespesas, prevDespesas);
  const varLucro = calculateVar(currentLucro, prevLucro);

  // The maximum height of any bar in pixels
  const BAR_CONTAINER_HEIGHT = 96; // h-24 is 96px
  const MAX_BAR_HEIGHT = 72; // leaves 24px headroom for the labels

  const maxVal = Math.max(
    Math.abs(currentReceita),
    Math.abs(prevReceita),
    Math.abs(currentDespesas),
    Math.abs(prevDespesas),
    Math.abs(currentLucro),
    Math.abs(prevLucro),
    1000
  );

  const getBarHeight = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal === 0) return 0;
    return Math.max(4, Math.round((absVal / maxVal) * MAX_BAR_HEIGHT));
  };

  const formatBarLabel = (val: number) => {
    if (val === 0) return '';
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(absVal);
    return val < 0 ? `-${formatted}` : formatted;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title & Toggle */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>equalizer</span>
            <h4 className="text-sm font-black text-on-surface tracking-tight">
              Comparativo Mensal
            </h4>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
          <button
            type="button"
            onClick={() => setActiveView('comparativo')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeView === 'comparativo'
                ? 'bg-primary text-on-primary font-black shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            📊 Comparativo
          </button>
          <button
            type="button"
            onClick={() => setActiveView('atual')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeView === 'atual'
                ? 'bg-primary text-on-primary font-black shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {currentMonthName} (Atual)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('anterior')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeView === 'anterior'
                ? 'bg-primary text-on-primary font-black shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {prevMonthName} (Ant.)
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-black/15 border border-white/5 rounded-2xl p-4.5 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {activeView === 'comparativo' && (
            <motion.div
              key="comparativo"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* Metric Cards Comparison Row */}
              <div className="grid grid-cols-3 gap-2">
                {/* Receita */}
                <div className="p-3 bg-surface-container/60 border border-white/5 rounded-xl text-left flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider">Receita</span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-xs font-black text-on-surface">{formatBRL(currentReceita)}</span>
                    <span className={`text-[9px] font-bold flex items-center gap-0.5 ${varReceita >= 0 ? 'text-tertiary' : 'text-error'}`}>
                      {varReceita >= 0 ? '▲' : '▼'} {Math.abs(Math.round(varReceita))}%
                    </span>
                  </div>
                </div>

                {/* Despesas */}
                <div className="p-3 bg-surface-container/60 border border-white/5 rounded-xl text-left flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider">Despesas</span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-xs font-black text-on-surface">{formatBRL(currentDespesas)}</span>
                    <span className={`text-[9px] font-bold flex items-center gap-0.5 ${varDespesas <= 0 ? 'text-tertiary' : 'text-error'}`}>
                      {varDespesas <= 0 ? '▼' : '▲'} {Math.abs(Math.round(varDespesas))}%
                    </span>
                  </div>
                </div>

                {/* Lucro */}
                <div className="p-3 bg-surface-container/60 border border-white/5 rounded-xl text-left flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider">Lucro</span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-xs font-black text-on-surface">{formatBRL(currentLucro)}</span>
                    <span className={`text-[9px] font-bold flex items-center gap-0.5 ${varLucro >= 0 ? 'text-tertiary' : 'text-error'}`}>
                      {varLucro >= 0 ? '▲' : '▼'} {Math.abs(Math.round(varLucro))}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Simple Side-by-Side SVG Bar Chart */}
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[9px] uppercase font-extrabold text-on-surface-variant tracking-wider text-left leading-none">
                  Gráfico Comparativo ({prevMonthName} vs {currentMonthName})
                </span>

                <div className="h-36 bg-surface-container-low/50 border border-white/5 rounded-xl flex items-end justify-around px-2 pb-2.5 pt-8 relative">
                  {/* Legend guide */}
                  <div className="absolute top-2.5 right-3.5 flex items-center gap-3 text-[9px] font-medium text-on-surface-variant/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#a078ff] border border-[#a078ff]/25 rounded-[3px]"></span> {prevMonthName}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#d0bcff] border border-[#d0bcff]/25 rounded-[3px]"></span> {currentMonthName}
                    </div>
                  </div>

                  {/* Receita Bars */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-end gap-3.5 h-[96px] relative">
                      {/* Prev */}
                      <div className="relative w-3.5 flex flex-col justify-end h-full">
                        {prevReceita !== 0 && (
                          <span 
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium text-on-surface-variant/90 tracking-tight mb-1"
                            style={{ bottom: `${getBarHeight(prevReceita)}px` }}
                          >
                            {formatBarLabel(prevReceita)}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: getBarHeight(prevReceita) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="w-full bg-[#a078ff] border border-[#a078ff]/20 rounded-t-[3px] shadow-sm"
                        />
                      </div>
                      {/* Curr */}
                      <div className="relative w-3.5 flex flex-col justify-end h-full">
                        {currentReceita !== 0 && (
                          <span 
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium text-white tracking-tight mb-1"
                            style={{ bottom: `${getBarHeight(currentReceita)}px` }}
                          >
                            {formatBarLabel(currentReceita)}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: getBarHeight(currentReceita) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="w-full bg-[#d0bcff] border border-[#d0bcff]/20 rounded-t-[3px] shadow-sm"
                        />
                      </div>
                    </div>
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest text-center mt-2.5">
                      Receita
                    </span>
                  </div>

                  {/* Despesas Bars */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-end gap-3.5 h-[96px] relative">
                      {/* Prev */}
                      <div className="relative w-3.5 flex flex-col justify-end h-full">
                        {prevDespesas !== 0 && (
                          <span 
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium text-on-surface-variant/90 tracking-tight mb-1"
                            style={{ bottom: `${getBarHeight(prevDespesas)}px` }}
                          >
                            {formatBarLabel(prevDespesas)}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: getBarHeight(prevDespesas) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="w-full bg-[#a078ff] border border-[#a078ff]/20 rounded-t-[3px] shadow-sm"
                        />
                      </div>
                      {/* Curr */}
                      <div className="relative w-3.5 flex flex-col justify-end h-full">
                        {currentDespesas !== 0 && (
                          <span 
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium text-white tracking-tight mb-1"
                            style={{ bottom: `${getBarHeight(currentDespesas)}px` }}
                          >
                            {formatBarLabel(currentDespesas)}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: getBarHeight(currentDespesas) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="w-full bg-[#d0bcff] border border-[#d0bcff]/20 rounded-t-[3px] shadow-sm"
                        />
                      </div>
                    </div>
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest text-center mt-2.5">
                      Despesas
                    </span>
                  </div>

                  {/* Lucro Bars */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-end gap-3.5 h-[96px] relative">
                      {/* Prev */}
                      <div className="relative w-3.5 flex flex-col justify-end h-full">
                        {prevLucro !== 0 && (
                          <span 
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium text-on-surface-variant/90 tracking-tight mb-1"
                            style={{ bottom: `${getBarHeight(prevLucro)}px` }}
                          >
                            {formatBarLabel(prevLucro)}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: getBarHeight(prevLucro) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`w-full rounded-t-[3px] shadow-sm ${
                            prevLucro < 0 
                              ? 'bg-error/85 border border-error/25' 
                              : 'bg-[#a078ff] border border-[#a078ff]/20'
                          }`}
                        />
                      </div>
                      {/* Curr */}
                      <div className="relative w-3.5 flex flex-col justify-end h-full">
                        {currentLucro !== 0 && (
                          <span 
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-medium text-white tracking-tight mb-1"
                            style={{ bottom: `${getBarHeight(currentLucro)}px` }}
                          >
                            {formatBarLabel(currentLucro)}
                          </span>
                        )}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: getBarHeight(currentLucro) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`w-full rounded-t-[3px] shadow-sm ${
                            currentLucro < 0 
                              ? 'bg-error border border-error/30' 
                              : 'bg-[#d0bcff] border border-[#d0bcff]/20'
                          }`}
                        />
                      </div>
                    </div>
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest text-center mt-2.5">
                      Lucro
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'atual' && (
            <motion.div
              key="atual"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3 text-left"
            >
              <span className="text-[10px] uppercase font-extrabold text-on-surface-variant tracking-wider leading-none">
                Mapeamento Financeiro: {currentMonthName}
              </span>
              <div className="flex flex-col gap-2 bg-surface-container/30 border border-white/5 rounded-xl p-3.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-bold text-on-surface-variant">Receita Acumulada:</span>
                  <span className="text-xs font-black text-tertiary">{formatBRL(currentReceita)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-white/5">
                  <span className="text-xs font-bold text-on-surface-variant">Despesas Operacionais:</span>
                  <span className="text-xs font-black text-error">{formatBRL(currentDespesas)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-t border-white/5">
                  <span className="text-xs font-extrabold text-on-surface">Lucro Líquido Gerado:</span>
                  <span className={`text-sm font-black ${currentLucro >= 0 ? 'text-tertiary' : 'text-error'}`}>{formatBRL(currentLucro)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'anterior' && (
            <motion.div
              key="anterior"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3 text-left"
            >
              <span className="text-[10px] uppercase font-extrabold text-on-surface-variant tracking-wider leading-none">
                Mapeamento Financeiro: {prevMonthName}
              </span>
              <div className="flex flex-col gap-2 bg-surface-container/30 border border-white/5 rounded-xl p-3.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-bold text-on-surface-variant">Receita Acumulada:</span>
                  <span className="text-xs font-black text-tertiary/75">{formatBRL(prevReceita)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-white/5">
                  <span className="text-xs font-bold text-on-surface-variant">Despesas Operacionais:</span>
                  <span className="text-xs font-black text-error/75">{formatBRL(prevDespesas)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-t border-white/5">
                  <span className="text-xs font-extrabold text-on-surface">Lucro Líquido Gerado:</span>
                  <span className={`text-sm font-black ${prevLucro >= 0 ? 'text-tertiary/85' : 'text-error/85'}`}>{formatBRL(prevLucro)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
