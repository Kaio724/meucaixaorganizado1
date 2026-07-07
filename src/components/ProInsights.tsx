import React from 'react';
import { motion } from 'motion/react';
import { Transaction } from '../types';

interface ProInsightsProps {
  transactions: Transaction[];
}

export default function ProInsights({ transactions }: ProInsightsProps) {
  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  // Current month txs
  const currentMonthTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  // Previous month txs
  const prevMonthTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
  });

  // Goal settings
  const goal = (() => {
    const saved = localStorage.getItem('mco_revenue_goal');
    return saved ? parseFloat(saved) : 10000; // fallback default
  })();

  // Current statistics
  const currentRevenues = currentMonthTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentExpenses = currentMonthTxs
    .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  // Previous statistics
  const prevRevenues = prevMonthTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevExpenses = prevMonthTxs
    .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  // Generate dynamic insights
  const insights: { id: string; text: string; icon: string; color: string; bg: string; border: string }[] = [];

  // 1. Revenue growth
  if (prevRevenues > 0 && currentRevenues > prevRevenues) {
    const growth = Math.round(((currentRevenues - prevRevenues) / prevRevenues) * 100);
    insights.push({
      id: 'revenue-growth',
      text: `📈 Seu faturamento cresceu ${growth}% em relação ao mês anterior.`,
      icon: 'trending_up',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    });
  } else if (currentRevenues > 0 && prevRevenues === 0) {
    insights.push({
      id: 'revenue-start',
      text: `📈 Faturamento iniciado! Você acumulou ${formatBRL(currentRevenues)} em receitas este mês.`,
      icon: 'trending_up',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    });
  }

  // 2. Savings or Expense warning
  if (prevExpenses > 0 && currentExpenses < prevExpenses) {
    const savedAmount = prevExpenses - currentExpenses;
    insights.push({
      id: 'expenses-saved',
      text: `💰 Você economizou ${formatBRL(savedAmount)} em custos operacionais comparado ao mês passado.`,
      icon: 'savings',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    });
  } else if (currentExpenses > prevExpenses && prevExpenses > 0) {
    insights.push({
      id: 'expenses-warning',
      text: '⚠ Seus gastos aumentaram. Revise as categorias de saídas para conter excessos.',
      icon: 'warning',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    });
  }

  // 3. Goal progress
  if (goal > 0) {
    const goalPercentage = Math.round((currentRevenues / goal) * 100);
    if (goalPercentage >= 70 && goalPercentage < 100) {
      insights.push({
        id: 'goal-near',
        text: `🎯 Meta quase concluída. Você já atingiu ${goalPercentage}% do seu faturamento pretendido!`,
        icon: 'tour',
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20'
      });
    } else if (goalPercentage >= 100) {
      insights.push({
        id: 'goal-achieved',
        text: `🎉 Meta superada! Você ultrapassou o objetivo de faturamento definido de ${formatBRL(goal)}.`,
        icon: 'workspace_premium',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
      });
    }
  }

  // 4. General constructive insights if list is short (ensure rich experience)
  if (insights.length < 2) {
    const currentProfit = currentRevenues - currentExpenses;
    if (currentProfit > 0) {
      insights.push({
        id: 'profit-positive',
        text: `💡 Seu saldo atual está no azul! Sobraram ${formatBRL(currentProfit)} para reinvestir ou retirar.`,
        icon: 'lightbulb',
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20'
      });
    } else if (currentExpenses > 0) {
      insights.push({
        id: 'profit-negative',
        text: '💡 Dica: Tente estabelecer limites semanais de saídas para reequilibrar o fluxo de caixa.',
        icon: 'lightbulb',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
        <h4 className="text-sm font-black text-on-surface tracking-tight">
          Insights do Mês
        </h4>
      </div>

      <div className="flex flex-col gap-2.5">
        {insights.map((insight, idx) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.25 }}
            className={`flex items-start gap-3 p-4 rounded-2xl border ${insight.bg} ${insight.border} hover:bg-opacity-80 transition-all text-left`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/5 bg-white/5`}>
              <span className={`material-symbols-outlined text-base ${insight.color}`}>
                {insight.icon}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-xs font-semibold leading-relaxed text-on-surface">
                {insight.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
