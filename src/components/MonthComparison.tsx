import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';

interface MonthComparisonProps {
  transactions: Transaction[];
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MonthComparison({ transactions }: MonthComparisonProps) {
  // Outer comparison period selector: 'mensal' or 'anual'
  const [comparePeriod, setComparePeriod] = useState<'mensal' | 'anual'>('mensal');
  
  // Mensal internal tabs
  const [activeView, setActiveView] = useState<'comparativo' | 'atual' | 'anterior'>('comparativo');
  
  // Anual configurations
  const [selectedCompareYear, setSelectedCompareYear] = useState<number>(2026);

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

  // Filter transactions for MENSAL
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
  const BAR_CONTAINER_HEIGHT = 80; // h-20 is 80px
  const MAX_BAR_HEIGHT = 56; // leaves 24px headroom for the labels

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

  // --- ANUAL CALCULATIONS & STRUCTURES ---
  const yearTxs = transactions.filter(t => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getFullYear() === selectedCompareYear;
  });

  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const monthTxs = yearTxs.filter(t => {
      const tDate = new Date(t.date + 'T12:00:00');
      return tDate.getMonth() === index;
    });

    const receita = monthTxs
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);

    const despesas = monthTxs
      .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
      .reduce((sum, t) => sum + t.amount, 0);

    const lucro = receita - despesas;

    return {
      monthIndex: index,
      monthName: MONTHS_PT[index],
      receita,
      despesas,
      lucro
    };
  });

  // Year totals
  const totalReceitaYear = monthlyData.reduce((sum, m) => sum + m.receita, 0);
  const totalDespesaYear = monthlyData.reduce((sum, m) => sum + m.despesas, 0);
  const totalLucroYear = totalReceitaYear - totalDespesaYear;
  const avgReceitaYear = totalReceitaYear / 12;

  // Records and Extrems of the year
  let maxReceitaVal = 0;
  let maxReceitaMonth = '-';
  let maxDespesaVal = 0;
  let maxDespesaMonth = '-';
  let maxLucroVal = -Infinity;
  let maxLucroMonth = '-';
  let minLucroVal = Infinity;
  let minLucroMonth = '-';

  monthlyData.forEach(m => {
    if (m.receita > maxReceitaVal) {
      maxReceitaVal = m.receita;
      maxReceitaMonth = m.monthName;
    }
    if (m.despesas > maxDespesaVal) {
      maxDespesaVal = m.despesas;
      maxDespesaMonth = m.monthName;
    }
    if (m.lucro > maxLucroVal) {
      maxLucroVal = m.lucro;
      maxLucroMonth = m.monthName;
    }
    if (m.lucro < minLucroVal) {
      minLucroVal = m.lucro;
      minLucroMonth = m.monthName;
    }
  });

  if (maxLucroVal === -Infinity) maxLucroVal = 0;
  if (minLucroVal === Infinity) minLucroVal = 0;

  const maxYearVal = Math.max(
    ...monthlyData.map(m => Math.max(m.receita, m.despesas, Math.abs(m.lucro))),
    1000
  );

  return (
    <div className="glass-card rounded-[24px] p-4 sm:p-5 shadow-xl border border-white/5 flex flex-col gap-4 sm:gap-5 relative overflow-hidden bg-gradient-to-b from-surface-container/60 to-surface-container-low/40 w-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-2xl pointer-events-none"></div>

      {/* Header Container */}
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-left">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>equalizer</span>
            <h4 className="text-sm font-black text-on-surface tracking-tight">
              {comparePeriod === 'mensal' ? 'Comparativo Mensal' : 'Comparativo Anual'}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {/* Year Selector (Only visible for Anual) */}
            {comparePeriod === 'anual' && (
              <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-xl border border-outline-variant/10">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Ano:</span>
                <select
                  value={selectedCompareYear}
                  onChange={(e) => setSelectedCompareYear(parseInt(e.target.value))}
                  className="bg-transparent border-none text-[10px] font-black text-primary focus:outline-none cursor-pointer p-0"
                >
                  <option value="2026" className="bg-[#121217] text-white">2026</option>
                  <option value="2025" className="bg-[#121217] text-white">2025</option>
                  <option value="2024" className="bg-[#121217] text-white">2024</option>
                </select>
              </div>
            )}

            {/* Mensal / Anual View Switcher */}
            <div className="flex bg-surface-container-low p-0.5 rounded-xl border border-outline-variant/10">
              <button
                type="button"
                onClick={() => setComparePeriod('mensal')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  comparePeriod === 'mensal'
                    ? 'bg-primary text-on-primary shadow-sm font-black'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setComparePeriod('anual')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  comparePeriod === 'anual'
                    ? 'bg-primary text-on-primary shadow-sm font-black'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Anual
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Internal Tabs (Only visible for Mensal) */}
        {comparePeriod === 'mensal' && (
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
        )}
      </div>

      {/* Main Container */}
      <div className="bg-black/15 border border-white/5 rounded-2xl p-3 sm:p-4 flex flex-col gap-4 relative z-10">
        <AnimatePresence mode="wait">
          {comparePeriod === 'mensal' ? (
            // --- MENSAL VIEW ---
            <div className="w-full">
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
                    <div className="p-2 sm:p-3 bg-surface-container/60 border border-white/5 rounded-xl text-left flex flex-col justify-between min-w-0">
                      <span className="text-[8px] xs:text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider truncate">Receita</span>
                      <div className="flex flex-col gap-0.5 mt-1 min-w-0">
                        <span className="text-[10px] xs:text-xs font-black text-on-surface truncate">{formatBRL(currentReceita)}</span>
                        <span className={`text-[8px] xs:text-[9px] font-bold flex items-center gap-0.5 ${varReceita >= 0 ? 'text-tertiary' : 'text-error'} truncate`}>
                          {varReceita >= 0 ? '▲' : '▼'} {Math.abs(Math.round(varReceita))}%
                        </span>
                      </div>
                    </div>

                    {/* Despesas */}
                    <div className="p-2 sm:p-3 bg-surface-container/60 border border-white/5 rounded-xl text-left flex flex-col justify-between min-w-0">
                      <span className="text-[8px] xs:text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider truncate">Despesas</span>
                      <div className="flex flex-col gap-0.5 mt-1 min-w-0">
                        <span className="text-[10px] xs:text-xs font-black text-on-surface truncate">{formatBRL(currentDespesas)}</span>
                        <span className={`text-[8px] xs:text-[9px] font-bold flex items-center gap-0.5 ${varDespesas <= 0 ? 'text-tertiary' : 'text-error'} truncate`}>
                          {varDespesas <= 0 ? '▼' : '▲'} {Math.abs(Math.round(varDespesas))}%
                        </span>
                      </div>
                    </div>

                    {/* Lucro */}
                    <div className="p-2 sm:p-3 bg-surface-container/60 border border-white/5 rounded-xl text-left flex flex-col justify-between min-w-0">
                      <span className="text-[8px] xs:text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider truncate">Lucro</span>
                      <div className="flex flex-col gap-0.5 mt-1 min-w-0">
                        <span className="text-[10px] xs:text-xs font-black text-on-surface truncate">{formatBRL(currentLucro)}</span>
                        <span className={`text-[8px] xs:text-[9px] font-bold flex items-center gap-0.5 ${varLucro >= 0 ? 'text-tertiary' : 'text-error'} truncate`}>
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

                    <div className="h-32 bg-surface-container-low/50 border border-white/5 rounded-xl flex items-end justify-around px-2 pb-2.5 pt-8 relative">
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
                        <div className="flex items-end gap-3.5 h-[80px] relative">
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
                        <div className="flex items-end gap-3.5 h-[80px] relative">
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
                        <div className="flex items-end gap-3.5 h-[80px] relative">
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
            </div>
          ) : (
            // --- ANUAL VIEW ---
            <motion.div
              key="anual"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 text-left w-full"
            >
              {/* Cards Inteligentes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Card 1: Acumulados */}
                <div className="p-2 sm:p-3 bg-surface-container/40 border border-white/5 rounded-xl text-left flex flex-col justify-between min-w-0">
                  <span className="text-[8px] xs:text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider truncate">Acumulado do Ano</span>
                  <div className="flex flex-col gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 min-w-0">
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Receita:</span>
                      <span className="font-extrabold text-tertiary truncate">{formatBRL(totalReceitaYear)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Despesa:</span>
                      <span className="font-extrabold text-error truncate">{formatBRL(totalDespesaYear)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Lucro:</span>
                      <span className={`font-extrabold ${totalLucroYear >= 0 ? 'text-blue-400' : 'text-error'} truncate`}>{formatBRL(totalLucroYear)}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Médias Mensais */}
                <div className="p-2 sm:p-3 bg-surface-container/40 border border-white/5 rounded-xl text-left flex flex-col justify-between min-w-0">
                  <span className="text-[8px] xs:text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider truncate">Médias Mensais</span>
                  <div className="flex flex-col gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 min-w-0">
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Média Rec.:</span>
                      <span className="font-bold text-on-surface truncate">{formatBRL(avgReceitaYear)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Média Desp.:</span>
                      <span className="font-bold text-on-surface-variant truncate">{formatBRL(totalDespesaYear / 12)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Média Lucro:</span>
                      <span className={`font-bold ${totalLucroYear >= 0 ? 'text-blue-400' : 'text-error'} truncate`}>{formatBRL(totalLucroYear / 12)}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Recordes Financeiros */}
                <div className="p-2 sm:p-3 bg-surface-container/40 border border-white/5 rounded-xl text-left flex flex-col justify-between min-w-0">
                  <span className="text-[8px] xs:text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider truncate">Recordes do Ano</span>
                  <div className="flex flex-col gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 min-w-0">
                    <div className="flex flex-col text-[9.5px] xs:text-xs leading-tight min-w-0">
                      <span className="text-on-surface-variant text-[8px] xs:text-[9px] truncate">Maior Faturamento:</span>
                      <span className="font-bold text-tertiary truncate">{formatBRL(maxReceitaVal)} <span className="text-[8px] text-on-surface-variant">({maxReceitaMonth})</span></span>
                    </div>
                    <div className="flex flex-col text-[9.5px] xs:text-xs leading-tight mt-0.5 min-w-0">
                      <span className="text-on-surface-variant text-[8px] xs:text-[9px] truncate">Maior Despesa:</span>
                      <span className="font-bold text-error truncate">{formatBRL(maxDespesaVal)} <span className="text-[8px] text-on-surface-variant">({maxDespesaMonth})</span></span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Meses Extremos */}
                <div className="p-2 sm:p-3 bg-surface-container/40 border border-white/5 rounded-xl text-left flex flex-col justify-between min-w-0">
                  <span className="text-[8px] xs:text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider truncate">Meses Extremos</span>
                  <div className="flex flex-col gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 min-w-0">
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Melhor Mês:</span>
                      <span className="font-bold text-tertiary truncate">{maxLucroMonth}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Pior Mês:</span>
                      <span className="font-bold text-error truncate">{minLucroMonth}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] xs:text-xs">
                      <span className="text-on-surface-variant text-[8.5px] xs:text-[10px] truncate mr-1">Maior Lucro:</span>
                      <span className="font-bold text-blue-400 truncate">{formatBRL(maxLucroVal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive SVG/HTML Bar Chart */}
              <div className="overflow-x-auto scrollbar-thin select-none pb-2 w-full">
                <div className="min-w-[600px] md:min-w-full h-44 bg-surface-container-low/50 border border-white/5 rounded-xl flex items-end justify-between px-4 pb-3 pt-10 relative">
                  {/* Legend guide */}
                  <div className="absolute top-2.5 right-4 flex items-center gap-3 text-[9px] font-medium text-on-surface-variant/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#d0bcff] rounded-[3px]"></span> Receita
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-error/70 rounded-[3px]"></span> Despesa
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-400 rounded-[3px]"></span> Lucro
                    </div>
                  </div>

                  {/* Chart Title */}
                  <div className="absolute top-2.5 left-4 text-[9px] uppercase font-extrabold text-on-surface-variant tracking-wider">
                    Evolução Mensal - {selectedCompareYear}
                  </div>

                  {/* 12 Months bars */}
                  {monthlyData.map(m => {
                    const recH = maxYearVal > 0 ? (m.receita / maxYearVal) * 100 : 0;
                    const despH = maxYearVal > 0 ? (m.despesas / maxYearVal) * 100 : 0;
                    const lucVal = m.lucro;
                    const lucH = maxYearVal > 0 ? (Math.abs(lucVal) / maxYearVal) * 100 : 0;

                    return (
                      <div key={m.monthIndex} className="flex flex-col items-center flex-1 group/bar relative">
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-[#121217] border border-white/10 rounded-lg p-2 text-[9px] leading-tight text-left shadow-xl pointer-events-none z-30 min-w-[110px] -translate-y-1">
                          <p className="font-extrabold text-white mb-0.5">{m.monthName}</p>
                          <p className="text-tertiary">Rec: {formatBRL(m.receita)}</p>
                          <p className="text-error">Desp: {formatBRL(m.despesas)}</p>
                          <p className={lucVal >= 0 ? 'text-blue-400 font-bold' : 'text-error font-bold'}>
                            Lucro: {formatBRL(lucVal)}
                          </p>
                        </div>

                        <div className="flex items-end gap-1 h-24 relative w-full justify-center">
                          {/* Receita bar */}
                          <div className="w-2 relative h-full flex flex-col justify-end">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${recH}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="w-full bg-[#d0bcff] rounded-t-[2px] shadow-sm"
                            />
                          </div>

                          {/* Despesa bar */}
                          <div className="w-2 relative h-full flex flex-col justify-end">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${despH}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="w-full bg-error/70 rounded-t-[2px] shadow-sm"
                            />
                          </div>

                          {/* Lucro bar */}
                          <div className="w-2 relative h-full flex flex-col justify-end">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${lucH}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={`w-full rounded-t-[2px] shadow-sm ${
                                lucVal >= 0 ? 'bg-blue-400' : 'bg-error/90'
                              }`}
                            />
                          </div>
                        </div>

                        <span className="text-[9px] font-bold text-on-surface-variant mt-2">
                          {m.monthName.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela de Evolução */}
              <div className="flex flex-col gap-2 w-full">
                <span className="text-[9px] uppercase font-extrabold text-on-surface-variant tracking-wider leading-none">
                  Planilha de Evolução Anual
                </span>
                <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-container/20 w-full">
                  <div className="max-h-60 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-surface-container-high/60 border-b border-white/5 select-none sticky top-0 z-10">
                          <th className="p-2.5 font-bold text-on-surface-variant/85 uppercase tracking-wider">Mês</th>
                          <th className="p-2.5 font-bold text-on-surface-variant/85 uppercase tracking-wider">Receita</th>
                          <th className="p-2.5 font-bold text-on-surface-variant/85 uppercase tracking-wider">Despesa</th>
                          <th className="p-2.5 font-bold text-on-surface-variant/85 uppercase tracking-wider text-right">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {monthlyData.map(m => (
                          <tr key={m.monthIndex} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-2.5 font-bold text-on-surface">{m.monthName}</td>
                            <td className="p-2.5 text-tertiary font-semibold">{formatBRL(m.receita)}</td>
                            <td className="p-2.5 text-error font-semibold">{formatBRL(m.despesas)}</td>
                            <td className={`p-2.5 text-right font-extrabold ${m.lucro >= 0 ? 'text-blue-400' : 'text-error'}`}>
                              {formatBRL(m.lucro)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
