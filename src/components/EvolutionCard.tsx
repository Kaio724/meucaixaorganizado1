import React from 'react';
import { motion } from 'motion/react';
import { Transaction } from '../types';

interface EvolutionCardProps {
  transactions: Transaction[];
}

interface MonthlyMetric {
  value: number;
  label: string;
}

// Hook or sub-component to animate the percentage counting up from 0
function AnimatedPercentage({ value }: { value: number }) {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (value === 0) {
      setCurrent(0);
      return;
    }
    const start = 0;
    const end = value;
    const duration = 800; // milliseconds
    const stepTime = 16; // ~60fps
    const steps = duration / stepTime;
    const increment = end / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      if (stepCount >= steps) {
        setCurrent(end);
        clearInterval(timer);
      } else {
        setCurrent(prev => prev + increment);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  if (value === 0) return <span>0%</span>;

  const formatted = Math.abs(current).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  const sign = value > 0 ? '+' : '-';
  return <span>{sign}{formatted}%</span>;
}

export default function EvolutionCard({ transactions }: EvolutionCardProps) {
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

  // Resolve current month and previous month dates
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  // Filter transactions
  const currentMonthTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  const prevMonthTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
  });

  // Calculate current month statistics
  const currentReceitas = currentMonthTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentDespesas = currentMonthTxs
    .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentRetiradas = currentMonthTxs
    .filter(t => t.type === 'saida' && t.category === 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentSaldo = currentReceitas - currentDespesas - currentRetiradas;

  // Calculate previous month statistics
  const prevReceitas = prevMonthTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevDespesas = prevMonthTxs
    .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevRetiradas = prevMonthTxs
    .filter(t => t.type === 'saida' && t.category === 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevSaldo = prevReceitas - prevDespesas - prevRetiradas;

  // Check if we have enough data (there are transactions in the previous month)
  // If no transactions in previous month, show elegant empty state
  const hasPreviousData = prevMonthTxs.length > 0;

  if (!hasPreviousData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] p-6 shadow-xl border border-white/5 flex flex-col items-center text-center gap-4 relative overflow-hidden bg-[#130f21]/90 backdrop-blur-xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(208,188,255,0.2)]">
          <span className="material-symbols-outlined text-2xl font-bold">analytics</span>
        </div>
        <div className="flex flex-col gap-1 max-w-[280px]">
          <h4 className="text-sm font-black text-white">Evolução do Negócio</h4>
          <p className="text-xs text-zinc-400 leading-relaxed font-medium">
            Ainda não há dados suficientes para mostrar sua evolução. Continue registrando suas movimentações para acompanhar o crescimento do seu negócio.
          </p>
        </div>
      </motion.div>
    );
  }

  // Calculate variations
  const getVariation = (current: number, previous: number) => {
    if (previous === 0) {
      if (current > 0) return 100;
      if (current === 0) return 0;
      return -100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const varReceitas = getVariation(currentReceitas, prevReceitas);
  const varDespesas = getVariation(currentDespesas, prevDespesas);
  const varSaldo = getVariation(currentSaldo, prevSaldo);
  const varRetiradas = getVariation(currentRetiradas, prevRetiradas);

  // Define positive/negative rules per metric to pick colors & icons
  // Receitas increase is positive (Good)
  const isReceitasPositive = varReceitas >= 0;
  // Despesas decrease is positive (Good)
  const isDespesasPositive = varDespesas <= 0;
  // Saldo increase is positive (Good)
  const isSaldoPositive = varSaldo >= 0;
  // Retiradas decrease is positive (Good, means keeping more cash in business, but let's treat it as neutral or good)
  const isRetiradasPositive = varRetiradas <= 0;

  // Let's build metrics list
  const metrics = [
    {
      title: 'Receita',
      current: currentReceitas,
      previous: prevReceitas,
      variation: varReceitas,
      isPositive: isReceitasPositive,
      icon: 'trending_up',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30'
    },
    {
      title: 'Despesas',
      current: currentDespesas,
      previous: prevDespesas,
      variation: varDespesas,
      isPositive: isDespesasPositive, // Going down is good
      icon: 'trending_down',
      iconColor: isDespesasPositive ? 'text-emerald-400' : 'text-rose-400',
      iconBg: isDespesasPositive ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-rose-500/15 border-rose-500/30'
    },
    {
      title: 'Lucro',
      current: currentSaldo,
      previous: prevSaldo,
      variation: varSaldo,
      isPositive: isSaldoPositive,
      icon: 'account_balance_wallet',
      iconColor: isSaldoPositive ? 'text-emerald-400' : 'text-rose-400',
      iconBg: isSaldoPositive ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-rose-500/15 border-rose-500/30'
    },
    {
      title: 'Retiradas',
      current: currentRetiradas,
      previous: prevRetiradas,
      variation: varRetiradas,
      isPositive: isRetiradasPositive, // Going down is good for the company treasury
      icon: 'payments',
      iconColor: isRetiradasPositive ? 'text-emerald-400' : 'text-rose-400',
      iconBg: isRetiradasPositive ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-rose-500/15 border-rose-500/30'
    }
  ];

  // Automatic Insight logic (Always constructive, never negative)
  let insightText = '';
  let insightIcon = 'lightbulb';
  let insightColor = 'text-primary bg-primary/10 border-primary/20';

  if (varSaldo > 0) {
    const rounded = Math.round(varSaldo);
    insightText = `Seu lucro líquido aumentou ${rounded}% em relação ao mês passado.`;
    insightIcon = 'trending_up';
    insightColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
  } else if (varReceitas > 0) {
    insightText = 'Excelente! Você faturou mais este mês.';
    insightIcon = 'celebrate';
    insightColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
  } else if (varDespesas < 0) {
    const rounded = Math.abs(Math.round(varDespesas));
    insightText = `Suas despesas diminuíram ${rounded}%! Parabéns pela economia de recursos.`;
    insightIcon = 'savings';
    insightColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
  } else if (varRetiradas < 0) {
    insightText = 'Você retirou menos dinheiro do negócio este mês, fortalecendo seu caixa.';
    insightIcon = 'shield_with_heart';
    insightColor = 'text-primary bg-primary/10 border-primary/25';
  } else if (varSaldo === 0 && varReceitas === 0 && varDespesas === 0) {
    insightText = 'Seus resultados estão estáveis. Continue mantendo o controle rigoroso.';
    insightIcon = 'info';
    insightColor = 'text-zinc-400 bg-white/5 border-white/10';
  } else {
    // If things worsened slightly, generate a constructive tip
    if (varDespesas > 0) {
      insightText = 'Vale acompanhar os gastos deste mês mais de perto para economizar.';
      insightIcon = 'analytics';
      insightColor = 'text-amber-300 bg-amber-400/10 border-amber-400/20';
    } else {
      insightText = 'Foque em gerar novas receitas essa semana para reequilibrar o saldo líquido.';
      insightIcon = 'tips_and_updates';
      insightColor = 'text-amber-300 bg-amber-400/10 border-amber-400/20';
    }
  }

  const prevMonthName = getMonthName(1);
  const currentMonthName = getMonthName(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[28px] p-5 shadow-xl border border-white/10 flex flex-col gap-4 relative overflow-hidden bg-[#130f21]/90 backdrop-blur-xl"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h4 className="text-sm font-black text-white tracking-tight">
            Evolução do Negócio
          </h4>
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
            Comparado ao mês anterior ({prevMonthName} vs. {currentMonthName})
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary" title="Insights Inteligentes">
          <span className="material-symbols-outlined text-base">monitoring</span>
        </div>
      </div>

      {/* Grid comparing month-over-month */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((item) => {
          const hasChange = item.variation !== 0;
          const isGoodChange = item.isPositive;

          return (
            <div 
              key={item.title}
              className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between min-h-[110px] relative hover:bg-black/60 transition-all"
            >
              {/* Metric Icon and Trend Badge */}
              <div className="flex items-start justify-between">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${item.iconBg}`}>
                  <span className={`material-symbols-outlined text-base ${item.iconColor}`}>
                    {item.icon}
                  </span>
                </div>

                {/* Growth indicator badge */}
                <div className="flex items-center gap-0.5 select-none font-sans">
                  {hasChange ? (
                    <span className={`text-[10px] font-black tracking-tight flex items-center gap-0.5 ${
                      isGoodChange ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      <span className="text-xs">
                        {isGoodChange ? '📈' : '📉'}
                      </span>
                      <AnimatedPercentage value={item.variation} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-500">
                      0%
                    </span>
                  )}
                </div>
              </div>

              {/* Values comparison */}
              <div className="flex flex-col mt-3.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  {item.title}
                </span>
                
                {/* Current Value */}
                <span className="text-sm font-black text-white mt-1 leading-none">
                  {formatBRL(item.current)}
                </span>

                {/* Previous Value */}
                <span className="text-[9px] text-zinc-500 font-semibold mt-1">
                  {prevMonthName}: {formatBRL(item.previous)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automatic Insight Footer */}
      <div className={`rounded-2xl p-3.5 border flex items-start gap-2.5 transition-all ${insightColor}`}>
        <span className="material-symbols-outlined text-lg mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
          {insightIcon}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90 leading-none">Insight do Negócio</span>
          <p className="text-xs font-semibold leading-relaxed mt-1 text-white/90">
            {insightText}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
