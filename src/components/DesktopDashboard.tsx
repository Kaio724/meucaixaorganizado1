import React from 'react';
import { motion } from 'motion/react';
import { Transaction, UserProfile, TransactionType } from '../types';
import EvolutionCard from './EvolutionCard';
import ProGrowthPanel from './ProGrowthPanel';
import ProInsights from './ProInsights';
import MonthComparison from './MonthComparison';

interface DesktopDashboardProps {
  profile: UserProfile;
  transactions: Transaction[];
  totalEntradas: number;
  totalSaidas: number;
  totalSobrou: number;
  totalRetiradas: number;
  sobrouPercentage: number;
  visibleTransactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onNavigateToTab: (tab: 'dashboard' | 'historico' | 'retirar' | 'resumo') => void;
  setShowQuickAdd: (show: boolean) => void;
  setShowProModal: (show: boolean) => void;
  setTxType: (type: TransactionType) => void;
  isPro: boolean;
}

export default function DesktopDashboard({
  profile,
  transactions,
  totalEntradas,
  totalSaidas,
  totalSobrou,
  totalRetiradas,
  sobrouPercentage,
  visibleTransactions,
  onAddTransaction,
  onNavigateToTab,
  setShowQuickAdd,
  setShowProModal,
  setTxType,
  isPro,
}: DesktopDashboardProps) {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const now = new Date();

  return (
    <div className="hidden lg:flex flex-col gap-8 w-full max-w-[1440px] mx-auto pb-12 text-left">
      {/* Row 0: Welcome Header & Quick Action Button */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full select-none tracking-wider uppercase">
              {profile.businessType === 'cnpj' ? 'MEI' : 'Autônomo'}
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-wider border ${
              isPro
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-white/10 text-on-surface-variant border-white/10'
            }`}>
              {profile.plan || 'essential'}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight mt-1.5">
            Olá, <span className="text-primary">{profile.name}</span>!
          </h2>
          <p className="text-xs text-on-surface-variant font-medium">
            Bem-vindo ao <span className="text-on-surface font-semibold">{profile.businessName}</span>. Seu fluxo de caixa de {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} está atualizado.
          </p>
        </div>

        {/* Small, Elegant "Lançar Movimentação" Button */}
        <div>
          <button
            onClick={() => { setTxType('entrada'); setShowQuickAdd(true); }}
            className="bg-primary hover:bg-[#8455ef] text-white font-extrabold text-xs tracking-wider uppercase py-3.5 px-6 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-[0_4px_14px_rgba(109,59,215,0.25)] hover:shadow-[0_6px_22px_rgba(109,59,215,0.45)] cursor-pointer active:scale-[0.98] border border-primary/30"
          >
            <span className="material-symbols-outlined text-sm font-black" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Lançar Movimentação
          </button>
        </div>
      </div>

      {/* Row 1: HERO PRINCIPAL (Full Width) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[32px] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-white/[0.06] bg-gradient-to-br from-[#1a1a24] via-[#121217] to-[#0b0b0f] relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full filter blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-tertiary/5 rounded-full filter blur-[60px] pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left part of the Hero: Value & Stats */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left relative z-10">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-black text-primary/80 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Sobrou este mês
              </span>
              <h1 className={`text-5xl font-black tracking-tight ${totalSobrou >= 0 ? 'text-on-surface' : 'text-error'}`}>
                {formatBRL(totalSobrou)}
              </h1>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                {(() => {
                  const prevMonthDate = new Date();
                  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
                  const prevMonth = prevMonthDate.getMonth();
                  const prevYear = prevMonthDate.getFullYear();
                  
                  const prevMonthTxs = transactions.filter((t) => {
                    const tDate = new Date(t.date + 'T12:00:00');
                    return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
                  });
                  const prevEntradas = prevMonthTxs.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
                  const prevSaidas = prevMonthTxs.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
                  const prevSobrou = prevEntradas - prevSaidas;
                  
                  const varSobrou = prevSobrou !== 0 ? ((totalSobrou - prevSobrou) / Math.abs(prevSobrou)) * 100 : (totalSobrou > 0 ? 100 : 0);
                  const hasPrevData = prevMonthTxs.length > 0;

                  if (!hasPrevData) {
                    return (
                      <span className="text-xs font-semibold text-on-surface-variant/80 bg-white/5 border border-white/5 rounded-full px-3 py-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Primeiro mês registrado (ótimo progresso!)
                      </span>
                    );
                  }

                  const isPositive = varSobrou >= 0;
                  return (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold rounded-full px-3 py-1 flex items-center gap-1 border ${
                          isPositive 
                            ? 'bg-[#10b981]/15 text-[#4edea3] border-[#10b981]/20' 
                            : 'bg-error/15 text-error border-error/20'
                        }`}>
                          <span className="material-symbols-outlined text-sm font-bold">
                            {isPositive ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                          {isPositive ? '+' : ''}{varSobrou.toFixed(1)}%
                        </span>
                        <span className="text-xs font-bold text-on-surface-variant">
                          em relação ao mês passado (sobra anterior: {formatBRL(prevSobrou)})
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Progress bar towards goal */}
              <div className="flex flex-col gap-2 mt-2 max-w-md bg-white/[0.02] border border-white/5 rounded-2xl p-4.5">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-primary">tour</span>
                    Sobra do Faturamento Mensal
                  </span>
                  <span className="text-primary font-black">
                    {sobrouPercentage}% Guardado
                  </span>
                </div>
                <div className="w-full bg-[#111115] h-2.5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-primary to-[#8b6eff] h-full transition-all duration-700 rounded-full"
                    style={{ width: `${sobrouPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant/65 font-semibold leading-none">
                  <span>Sobrou: {formatBRL(totalSobrou)}</span>
                  <span>Faturado: {formatBRL(totalEntradas)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right part of the Hero: Extremely clean sparkline line graph */}
          <div className="lg:col-span-5 flex flex-col justify-center relative z-10 w-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none">
                Evolução do Caixa (Mês Vigente)
              </span>
              <span className="text-[10px] font-bold text-tertiary bg-tertiary/10 border border-tertiary/20 px-2.5 py-0.5 rounded-full">
                Tempo Real
              </span>
            </div>

            {/* Draw Custom SVG Sparkline Area & Line */}
            <div className="w-full bg-[#0d0d12]/60 border border-white/5 rounded-2xl p-4.5 flex items-center justify-center h-[140px] relative overflow-hidden group hover:border-white/10 transition-all duration-300">
              {(() => {
                const sortedTxs = [...visibleTransactions].sort((a, b) => a.date.localeCompare(b.date));
                let runningSum = 0;
                let balancePoints = sortedTxs.map(tx => {
                  runningSum += tx.type === 'entrada' ? tx.amount : -tx.amount;
                  return runningSum;
                });

                if (balancePoints.length === 0) {
                  balancePoints = [0, 1000, 1500, 1200, 2200, 3100, 4500, 4000, 5200];
                } else if (balancePoints.length === 1) {
                  balancePoints = [balancePoints[0] * 0.8, balancePoints[0]];
                } else if (balancePoints.length < 5) {
                  balancePoints = [0, ...balancePoints];
                }

                const width = 340;
                const height = 110;
                const padding = 10;
                
                const min = Math.min(...balancePoints);
                const max = Math.max(...balancePoints);
                const range = max - min === 0 ? 1 : max - min;
                
                const coords = balancePoints.map((val, index) => {
                  const x = padding + (index / (balancePoints.length - 1)) * (width - 2 * padding);
                  const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
                  return { x, y };
                });

                let linePath = `M ${coords[0].x} ${coords[0].y}`;
                for (let i = 0; i < coords.length - 1; i++) {
                  const curr = coords[i];
                  const next = coords[i + 1];
                  const cpX1 = curr.x + (next.x - curr.x) / 3;
                  const cpY1 = curr.y;
                  const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
                  const cpY2 = next.y;
                  linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
                }

                const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

                return (
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="heroSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.02)" strokeDasharray="4 4" />
                    
                    <path d={areaPath} fill="url(#heroSparklineGrad)" className="transition-all duration-500" />
                    
                    <path d={linePath} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-500" />
                    
                    {coords.length > 0 && (
                      <g>
                        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="6" fill="#8b5cf6" className="animate-ping origin-center" style={{ transformOrigin: `${coords[coords.length - 1].x}px ${coords[coords.length - 1].y}px` }} />
                        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="4" fill="#a78bfa" stroke="#131315" strokeWidth="1.5" />
                      </g>
                    )}
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Row 2: CARDS SECUNDÁRIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {/* Card 1: Entradas */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 bg-gradient-to-b from-surface-container/20 to-surface-container-low/10 flex flex-col justify-between min-h-[124px] relative group hover:border-tertiary/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-tertiary/5 rounded-full filter blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Entradas do Mês</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center border border-tertiary/20">
              <span className="material-symbols-outlined text-tertiary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </div>
          </div>
          <div className="flex flex-col text-left mt-3">
            <span className="text-xl font-black text-tertiary tracking-tight leading-none">
              {formatBRL(totalEntradas)}
            </span>
            <span className="text-[10px] text-on-surface-variant/70 font-semibold mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              Receitas brutas operacionais
            </span>
          </div>
        </div>

        {/* Card 2: Saídas */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 bg-gradient-to-b from-surface-container/20 to-surface-container-low/10 flex flex-col justify-between min-h-[124px] relative group hover:border-error/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-error/5 rounded-full filter blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Saídas do Mês</span>
            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center border border-error/20">
              <span className="material-symbols-outlined text-error text-base" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_downward</span>
            </div>
          </div>
          <div className="flex flex-col text-left mt-3">
            <span className="text-xl font-black text-error tracking-tight leading-none">
              {formatBRL(totalSaidas)}
            </span>
            <span className="text-[10px] text-on-surface-variant/70 font-semibold mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
              Despesas totais do período
            </span>
          </div>
        </div>

        {/* Card 3: Retiradas */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 bg-gradient-to-b from-surface-container/20 to-surface-container-low/10 flex flex-col justify-between min-h-[124px] relative group hover:border-primary/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full filter blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Retiradas</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            </div>
          </div>
          <div className="flex flex-col text-left mt-3">
            <span className="text-xl font-black text-primary tracking-tight leading-none">
              {formatBRL(totalRetiradas)}
            </span>
            <span className="text-[10px] text-on-surface-variant/70 font-semibold mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Salário do sócio (Pró-Labore)
            </span>
          </div>
        </div>

        {/* Card 4: Saldo Final */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 bg-gradient-to-b from-surface-container/20 to-surface-container-low/10 flex flex-col justify-between min-h-[124px] relative group hover:border-blue-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Saldo Líquido</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <span className="material-symbols-outlined text-blue-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
            </div>
          </div>
          <div className="flex flex-col text-left mt-3">
            <span className={`text-xl font-black tracking-tight leading-none ${totalSobrou >= 0 ? 'text-blue-400' : 'text-error'}`}>
              {formatBRL(totalSobrou)}
            </span>
            <span className="text-[10px] text-on-surface-variant/70 font-semibold mt-1.5 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${totalSobrou >= 0 ? 'bg-blue-400' : 'bg-error'}`}></span>
              Disponível para reinvestimento
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: CORE CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        
        {/* LEFT CONTAINER (col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-8 text-left">
          
          {/* Gráfico Principal */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">compare_arrows</span>
                <h3 className="text-sm font-bold text-on-surface">Comparativo Analítico Mensal</h3>
              </div>
              <span className="text-[10px] text-on-surface-variant/60 font-medium bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
                Exclusivo PRO
              </span>
            </div>
            
            <div className="relative rounded-[24px] overflow-hidden">
              {!isPro && (
                <div className="absolute inset-0 bg-[#0c0c0f]/85 backdrop-blur-[6px] z-20 flex flex-col items-center justify-center text-center p-6 border border-white/10 rounded-[24px]">
                  <div className="w-11 h-11 rounded-2xl bg-[#6934D1]/20 border border-[#6934D1]/30 flex items-center justify-center text-[#9b72ff] mb-3 shadow-[0_0_15px_rgba(105,52,209,0.25)]">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </div>
                  <h4 className="text-sm font-black text-on-surface">Módulo de Comparativo Mensal</h4>
                  <p className="text-[11px] text-on-surface-variant max-w-[340px] mt-1 leading-relaxed">
                    Visualize a distribuição detalhada de suas receitas, despesas e lucro em barras comparativas do mês atual contra o anterior.
                  </p>
                  <button
                    onClick={() => setShowProModal(true)}
                    className="mt-4 px-4 py-2 bg-[#6934D1] hover:bg-[#834aff] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(105,52,209,0.3)] hover:shadow-[0_0_25px_rgba(105,52,209,0.55)] cursor-pointer"
                  >
                    Desbloquear com o PRO
                  </button>
                </div>
              )}
              <MonthComparison transactions={transactions} />
            </div>
          </div>

          {/* Últimos Lançamentos */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
                <h3 className="text-sm font-bold text-on-surface">Últimos Lançamentos do Negócio</h3>
              </div>
              <button 
                onClick={() => onNavigateToTab('historico')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-all active:scale-95 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-[11px]"
              >
                Ver histórico completo
                <span className="material-symbols-outlined text-[10px] font-bold">arrow_forward</span>
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 rounded-[24px] bg-surface-container/20 border border-outline-variant/10 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl">folder_off</span>
                </div>
                <span className="text-xs text-on-surface-variant font-bold">Nenhum lançamento registrado este mês</span>
              </div>
            ) : (
              <div className="glass-card rounded-[24px] border border-white/[0.05] overflow-hidden bg-gradient-to-b from-[#131317]/80 to-[#0e0e11]/80 p-2 shadow-xl">
                <div className="flex flex-col gap-2">
                  {transactions.slice(0, 5).map((tx) => {
                    const dateObj = tx.date ? new Date(tx.date + 'T12:00:00') : new Date();
                    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const isIncoming = tx.type === 'entrada';

                    return (
                      <div 
                        key={tx.id} 
                        className="group px-6 py-4 rounded-2xl flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.02] hover:border-white/[0.06] transition-all duration-300 select-none min-h-[72px]"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1 lg:w-1/3 text-left">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300 ${
                            isIncoming 
                              ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' 
                              : 'bg-error/10 text-error border border-error/20'
                          }`}>
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {isIncoming ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h4 className="text-sm font-bold text-on-surface truncate tracking-tight group-hover:text-primary transition-colors leading-tight">
                              {tx.title}
                            </h4>
                            <span className="text-[10px] text-on-surface-variant/70 font-semibold mt-1">
                              {tx.paymentMethod}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center w-1/4 px-2 min-w-0 text-left">
                          <span className="text-xs font-bold text-on-surface-variant/80 truncate bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1">
                            {tx.category}
                          </span>
                        </div>

                        <div className="flex items-center w-32 px-2 shrink-0">
                          <span className="text-xs font-semibold text-on-surface-variant/50">
                            {formattedDate}
                          </span>
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <span className={`text-base font-black tracking-tight ${
                            isIncoming ? 'text-tertiary' : 'text-error'
                          }`}>
                            {isIncoming ? '+' : '-'} {formatBRL(tx.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CONTAINER (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-8 text-left">
          
          {/* Meta e Saúde Financeira */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base font-bold">workspace_premium</span>
                <h3 className="text-sm font-extrabold text-on-surface">Análise de Performance PRO</h3>
              </div>
            </div>

            <div className="relative rounded-[24px] overflow-hidden">
              {!isPro && (
                <div className="absolute inset-0 bg-[#0c0c0f]/85 backdrop-blur-[5px] z-20 flex flex-col items-center justify-center text-center p-5 border border-white/10 rounded-[24px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2.5">
                    <span className="material-symbols-outlined text-lg">track_changes</span>
                  </div>
                  <h4 className="text-xs font-black text-on-surface">Metas & Saúde Financeira</h4>
                  <p className="text-[10px] text-on-surface-variant max-w-[220px] mt-1 leading-normal">
                    Acompanhe objetivos de faturamento com barras de progresso reais e receba notas de saúde do caixa.
                  </p>
                  <button
                    onClick={() => setShowProModal(true)}
                    className="mt-3.5 px-3 py-1.5 bg-primary hover:bg-[#8455ef] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Ativar com o PRO
                  </button>
                </div>
              )}
              <ProGrowthPanel
                transactions={transactions}
                isPro={isPro}
                onUnlockPro={() => setShowProModal(true)}
              />
            </div>
          </div>

          {/* Evolução do Negócio */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base font-bold">analytics</span>
                <h3 className="text-sm font-extrabold text-on-surface">Evolução do Caixa</h3>
              </div>
            </div>

            <div className="relative rounded-[24px] overflow-hidden">
              {!isPro && (
                <div className="absolute inset-0 bg-[#0c0c0f]/85 backdrop-blur-[5px] z-20 flex flex-col items-center justify-center text-center p-5 border border-white/10 rounded-[24px]">
                  <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center text-[#00e5ff] mb-2.5">
                    <span className="material-symbols-outlined text-lg">trending_up</span>
                  </div>
                  <h4 className="text-xs font-black text-on-surface">Comparativos Históricos MoM</h4>
                  <p className="text-[10px] text-on-surface-variant max-w-[220px] mt-1 leading-normal">
                    Monitore crescimento de receitas, despesas e pro-labore com comparativos reais do mês anterior.
                  </p>
                  <button
                    onClick={() => setShowProModal(true)}
                    className="mt-3.5 px-3 py-1.5 bg-primary hover:bg-[#8455ef] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Ativar com o PRO
                  </button>
                </div>
              )}
              <EvolutionCard transactions={transactions} />
            </div>
          </div>

          {/* Insights Inteligentes */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base font-bold">lightbulb</span>
                <h3 className="text-sm font-extrabold text-on-surface">Diretrizes & Insights</h3>
              </div>
            </div>

            <div className="relative rounded-[24px] overflow-hidden">
              {!isPro && (
                <div className="absolute inset-0 bg-[#0c0c0f]/85 backdrop-blur-[5px] z-20 flex flex-col items-center justify-center text-center p-5 border border-white/10 rounded-[24px]">
                  <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center text-[#ffd700] mb-2.5">
                    <span className="material-symbols-outlined text-lg">psychology</span>
                  </div>
                  <h4 className="text-xs font-black text-on-surface">Diretrizes de Crescimento</h4>
                  <p className="text-[10px] text-on-surface-variant max-w-[220px] mt-1 leading-normal">
                    Algoritmo automatizado que estuda suas finanças e dá conselhos táticos inteligentes sob medida.
                  </p>
                  <button
                    onClick={() => setShowProModal(true)}
                    className="mt-3.5 px-3 py-1.5 bg-primary hover:bg-[#8455ef] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Ativar com o PRO
                  </button>
                </div>
              )}
              <ProInsights transactions={transactions} />
            </div>
          </div>

          {/* Lifetime access */}
          <div className="glass-card rounded-[24px] p-5 border border-primary/20 bg-primary/5 flex items-start gap-3 text-left">
            <span className="material-symbols-outlined text-primary text-lg shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-primary font-black uppercase tracking-wider">Acesso Vitalício Garantido</span>
              <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed mt-1">
                Membros PRO possuem <span className="text-primary font-extrabold">atualizações vitalícias</span> a novos recursos e melhorias no Meu Caixa Organizado.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
