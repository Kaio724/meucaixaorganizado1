import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PieChart as PieChartIcon, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Wallet, 
  Layers 
} from 'lucide-react';
import { OrcamentoPessoal, MetaPessoal, Transaction, UserProfile } from '../../types';
import { fetchOrcamentos, fetchMetas } from '../../lib/personalData';
import { getPersonalCategoryInfo } from '../../lib/personalCategories';

interface PersonalSummaryProps {
  profile: UserProfile;
  userId: string;
  transactions: Transaction[];
  onNavigateToTab?: (tab: any) => void;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function PersonalSummary({
  profile,
  userId,
  transactions,
  onNavigateToTab
}: PersonalSummaryProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const [orcamentos, setOrcamentos] = useState<OrcamentoPessoal[]>([]);
  const [metas, setMetas] = useState<MetaPessoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAux() {
      setLoading(true);
      try {
        const [o, m] = await Promise.all([
          fetchOrcamentos(userId, selectedMonth, selectedYear),
          fetchMetas(userId)
        ]);
        setOrcamentos(o);
        setMetas(m);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    loadAux();
  }, [userId, selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  // Filter personal transactions for selected month
  const currentTxs = transactions.filter(t => {
    if (t.accountType !== 'pessoal') return false;
    const d = new Date(t.date + 'T12:00:00');
    return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Filter personal transactions for previous month
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevTxs = transactions.filter(t => {
    if (t.accountType !== 'pessoal') return false;
    const d = new Date(t.date + 'T12:00:00');
    return (d.getMonth() + 1) === prevMonth && d.getFullYear() === prevYear;
  });

  // Current Month totals
  const totalEntradas = currentTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = currentTxs
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;
  const savingsRate = totalEntradas > 0 ? (saldo / totalEntradas) * 100 : 0;

  // Previous Month totals for MoM comparison
  const prevEntradas = prevTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevSaidas = prevTxs
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  // Growth percentage
  const diffSaidasPct = prevSaidas > 0 ? ((totalSaidas - prevSaidas) / prevSaidas) * 100 : null;
  const diffEntradasPct = prevEntradas > 0 ? ((totalEntradas - prevEntradas) / prevEntradas) * 100 : null;

  // Category distribution for expenses
  const categoryTotals: { [key: string]: number } = {};
  currentTxs
    .filter(t => t.type === 'saida')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      pct: totalSaidas > 0 ? (amount / totalSaidas) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategories = sortedCategories.slice(0, 5);

  // SVG Donut Chart Calculation
  let cumulativePct = 0;
  const donutSlices = topCategories.map((item, i) => {
    const startPct = cumulativePct;
    cumulativePct += item.pct;
    const catInfo = getPersonalCategoryInfo(item.category, 'saida', userId);
    
    // Pick color
    const colors = ['#7C3AED', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
    const sliceColor = colors[i % colors.length];

    return {
      ...item,
      sliceColor,
      icon: catInfo.icon,
      startPct,
      endPct: cumulativePct
    };
  });

  // Budgets summary
  const totalOrcado = orcamentos.reduce((sum, o) => sum + o.valor_limite, 0);
  const totalGastoOrcado = orcamentos.reduce((sum, o) => {
    const spent = (categoryTotals[o.categoria_nome] || 0);
    return sum + spent;
  }, 0);
  const estourados = orcamentos.filter(o => (categoryTotals[o.categoria_nome] || 0) > o.valor_limite);

  // Active goals summary
  const activeMetas = metas.filter(m => m.status === 'ativa');

  // Dynamic Insight Generation
  let insightText = '';
  let insightTone: 'positive' | 'neutral' | 'warning' = 'neutral';

  if (totalEntradas === 0 && totalSaidas === 0) {
    insightText = 'Nenhum lançamento registrado neste mês ainda. Lance suas entradas e saídas para ver suas estatísticas detalhadas.';
    insightTone = 'neutral';
  } else if (saldo < 0) {
    insightText = `Seus gastos superaram suas receitas em ${formatBRL(Math.abs(saldo))} neste mês. Observe as categorias no limite para reequilibrar o próximo ciclo.`;
    insightTone = 'warning';
  } else if (savingsRate >= 25) {
    insightText = `Excelente ritmo financeiro! Você conseguiu poupar ${savingsRate.toFixed(0)}% de tudo que ganhou neste mês (${formatBRL(saldo)} livres).`;
    insightTone = 'positive';
  } else if (topCategories.length > 0 && topCategories[0].pct >= 40) {
    insightText = `A categoria "${topCategories[0].category}" concentrou ${topCategories[0].pct.toFixed(0)}% de todas as suas despesas. Que tal definir um orçamento específico para ela?`;
    insightTone = 'neutral';
  } else {
    insightText = `Você encerrou o período com saldo positivo de ${formatBRL(saldo)}. Bom momento para destinar uma parte para suas Metas de Economia!`;
    insightTone = 'positive';
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 text-left pb-24">
      
      {/* Header with Month Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171228]/90 to-[#100c1e]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/35 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#c4b5fd] uppercase tracking-wider bg-[#7C3AED]/15 px-2 py-0.5 rounded-full border border-[#7C3AED]/30">
                Conta Pessoal
              </span>
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                Análise de Performance
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Resumo Mensal
            </h2>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 text-xs font-bold text-white min-w-[130px] text-center uppercase tracking-wide">
            {MONTHS_PT[selectedMonth - 1]} {selectedYear}
          </div>
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-emerald-500/20 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Entradas no Mês
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              {formatBRL(totalEntradas)}
            </div>
            {diffEntradasPct !== null && (
              <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 mt-1">
                {diffEntradasPct >= 0 ? (
                  <span className="text-emerald-400 flex items-center">+{diffEntradasPct.toFixed(0)}% vs mês ant.</span>
                ) : (
                  <span className="text-rose-400 flex items-center">{diffEntradasPct.toFixed(0)}% vs mês ant.</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Saídas */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-rose-500/20 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Saídas no Mês
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight">
              {formatBRL(totalSaidas)}
            </div>
            {diffSaidasPct !== null && (
              <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 mt-1">
                {diffSaidasPct <= 0 ? (
                  <span className="text-emerald-400 flex items-center">{diffSaidasPct.toFixed(0)}% vs mês ant. (economizou)</span>
                ) : (
                  <span className="text-rose-400 flex items-center">+{diffSaidasPct.toFixed(0)}% vs mês ant.</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Saldo */}
        <div className={`p-5 rounded-[24px] bg-[#140f24]/90 border backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3 ${
          saldo >= 0 ? 'border-primary/30' : 'border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Saldo do Mês
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-xl sm:text-2xl font-black tracking-tight ${saldo >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatBRL(saldo)}
            </div>
            <span className="text-[10px] text-zinc-500 font-semibold mt-1 block">
              {saldo >= 0 ? 'Superávit pessoal' : 'Déficit no período'}
            </span>
          </div>
        </div>

        {/* Taxa de Poupança */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-[#7C3AED]/30 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Taxa de Poupança
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#c4b5fd]">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-[#c4b5fd] tracking-tight">
              {savingsRate > 0 ? `${savingsRate.toFixed(0)}%` : '0%'}
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold mt-1 block">
              {savingsRate > 0 ? `Você guardou ${savingsRate.toFixed(0)}% do que ganhou` : 'Sem economia neste mês'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic AI / Personal Insight Banner */}
      <div className={`p-5 rounded-[24px] border backdrop-blur-xl flex items-start gap-3.5 shadow-lg ${
        insightTone === 'positive'
          ? 'bg-emerald-500/10 border-emerald-500/25'
          : insightTone === 'warning'
          ? 'bg-rose-500/10 border-rose-500/25'
          : 'bg-[#7C3AED]/10 border-[#7C3AED]/25'
      }`}>
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-300">
            Insight Financeiro Pessoal
          </span>
          <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
            {insightText}
          </p>
        </div>
      </div>

      {/* Middle Section: Donut Chart + Top Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Categories Distribution */}
        <div className="p-6 rounded-[28px] bg-[#130f21]/90 border border-white/5 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7C3AED]" />
              Top 5 Gastos por Categoria
            </h3>
            <span className="text-xs font-bold text-zinc-400">
              Total: {formatBRL(totalSaidas)}
            </span>
          </div>

          {topCategories.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-medium">
              Nenhuma saída registrada neste mês para exibir a distribuição.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {donutSlices.map((item) => {
                const catInfo = getPersonalCategoryInfo(item.category, 'saida', userId);

                return (
                  <div key={item.category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.sliceColor }}
                        />
                        <span className="font-bold text-white">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-black text-white">
                          {formatBRL(item.amount)}
                        </span>
                        <span className="text-[11px] font-extrabold text-zinc-400 w-10 text-right">
                          {item.pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.pct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.sliceColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Budgets & Goals Summary Panel */}
        <div className="flex flex-col gap-4">
          {/* Orçamentos Snapshot */}
          <div className="p-5 rounded-[28px] bg-[#130f21]/90 border border-white/5 backdrop-blur-xl shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-[#7C3AED]" />
                Status dos Orçamentos
              </h4>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('orcamentos')}
                  className="text-[11px] font-bold text-[#c4b5fd] hover:text-white cursor-pointer"
                >
                  Gerenciar →
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5 text-xs">
              <div>
                <span className="text-zinc-400 text-[10px] uppercase font-bold block">Gasto vs Orçado</span>
                <span className="font-black text-white">{formatBRL(totalGastoOrcado)} de {formatBRL(totalOrcado)}</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase ${
                estourados.length > 0
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {estourados.length > 0 ? `${estourados.length} estourado(s)` : 'Tudo no controle'}
              </span>
            </div>
          </div>

          {/* Metas Snapshot */}
          <div className="p-5 rounded-[28px] bg-[#130f21]/90 border border-white/5 backdrop-blur-xl shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Metas em Andamento
              </h4>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('metas')}
                  className="text-[11px] font-bold text-[#c4b5fd] hover:text-white cursor-pointer"
                >
                  Ver Metas →
                </button>
              )}
            </div>

            {activeMetas.length === 0 ? (
              <div className="text-xs text-zinc-500 py-2">
                Nenhuma meta ativa no momento.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeMetas.slice(0, 2).map((m) => {
                  const pct = m.valor_alvo > 0 ? (m.valor_atual / m.valor_alvo) * 100 : 0;
                  return (
                    <div key={m.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.cor || '#7C3AED' }} />
                        <span className="font-bold text-white">{m.nome}</span>
                      </div>
                      <span className="font-extrabold text-zinc-300">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
