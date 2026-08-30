import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PiggyBank, 
  Target, 
  Repeat, 
  PieChart, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  TrendingUp,
  Clock
} from 'lucide-react';
import { Transaction, UserProfile, OrcamentoPessoal, MetaPessoal, RecorrenciaPessoal } from '../types';
import { getPersonalCategoryInfo } from '../lib/personalCategories';
import { fetchOrcamentos, fetchMetas, fetchRecorrencias, saveRecorrencia, computeNextDate } from '../lib/personalData';
import TransactionDetailSheet from './TransactionDetailSheet';

interface PersonalDashboardProps {
  profile: UserProfile;
  userId?: string;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void> | void;
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onNavigateToTab: (tab: any) => void;
  onOpenAddModal: () => void;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function PersonalDashboard({
  profile,
  userId = 'default_user',
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateToTab,
  onOpenAddModal,
}: PersonalDashboardProps) {
  const now = new Date();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [orcamentos, setOrcamentos] = useState<OrcamentoPessoal[]>([]);
  const [metas, setMetas] = useState<MetaPessoal[]>([]);
  const [recorrencias, setRecorrencias] = useState<RecorrenciaPessoal[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [dashboardToast, setDashboardToast] = useState<string | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  const showToast = (msg: string) => {
    setDashboardToast(msg);
    setTimeout(() => setDashboardToast(null), 3500);
  };

  const loadExtraData = async () => {
    try {
      const [orc, met, rec] = await Promise.all([
        fetchOrcamentos(userId, selectedMonthIndex + 1, selectedYear),
        fetchMetas(userId),
        fetchRecorrencias(userId)
      ]);
      setOrcamentos(orc);
      setMetas(met);
      setRecorrencias(rec);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingExtras(false);
    }
  };

  useEffect(() => {
    loadExtraData();
  }, [userId, selectedMonthIndex, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  // Filter transactions by selected month & year
  const monthTransactions = transactions.filter((t) => {
    if (t.accountType !== 'pessoal') return false;
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === selectedMonthIndex && tDate.getFullYear() === selectedYear;
  });

  // Calculate stats for current personal account
  const totalEntradas = monthTransactions
    .filter((t) => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = monthTransactions
    .filter((t) => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoPessoal = totalEntradas - totalSaidas;

  // Format currency helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Latest 5 transactions
  const recentTransactions = [...monthTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const isCurrentMonth = selectedMonthIndex === now.getMonth() && selectedYear === now.getFullYear();

  // Budgets calculations
  const totalOrcado = orcamentos.reduce((sum, o) => sum + o.valor_limite, 0);
  const totalGastoOrcado = orcamentos.reduce((sum, o) => {
    const spent = monthTransactions
      .filter(t => t.type === 'saida' && t.category.toLowerCase().trim() === o.categoria_nome.toLowerCase().trim())
      .reduce((s, t) => s + t.amount, 0);
    return sum + spent;
  }, 0);
  const pctOrcado = totalOrcado > 0 ? (totalGastoOrcado / totalOrcado) * 100 : 0;

  // Active Goals calculations
  const activeMetas = metas.filter(m => m.status === 'ativa');
  const totalGuardadoMetas = activeMetas.reduce((sum, m) => sum + m.valor_atual, 0);

  // Upcoming Recurrences (Next 3 days)
  const upcomingRecs = recorrencias.filter(r => {
    if (!r.ativo) return false;
    const target = new Date(r.proxima_data + 'T12:00:00').getTime();
    const diffDays = (target - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 4;
  });

  const handleQuickLancarRec = async (rec: RecorrenciaPessoal) => {
    try {
      await onAddTransaction({
        title: rec.descricao,
        amount: rec.valor,
        type: rec.tipo,
        date: rec.proxima_data,
        category: rec.categoria,
        paymentMethod: rec.forma_pagamento || 'Pix',
        account: rec.forma_pagamento === 'Cartão de Crédito' ? 'Cartão de Crédito' : 'Conta Corrente',
        accountType: 'pessoal',
        description: `Lançado via Recorrência (${rec.frequencia})`
      });

      const nextDate = computeNextDate(rec.proxima_data, rec.frequencia, rec.dia_cobranca);
      await saveRecorrencia(userId, {
        ...rec,
        proxima_data: nextDate
      });

      showToast(`Lançamento de ${formatBRL(rec.valor)} realizado!`);
      await loadExtraData();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 text-left pb-24">
      
      {/* Toast */}
      <AnimatePresence>
        {dashboardToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 bg-[#181428] border border-[#7C3AED]/40 rounded-2xl text-xs font-bold text-white shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{dashboardToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Welcome & Month Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171228]/80 to-[#100c1e]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/35 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <span className="material-symbols-outlined text-2xl font-bold">account_circle</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#c4b5fd] uppercase tracking-wider bg-[#7C3AED]/15 px-2 py-0.5 rounded-full border border-[#7C3AED]/30">
                Conta Pessoal
              </span>
              {isCurrentMonth && (
                <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Mês Atual
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              Finanças Pessoais de <span className="text-[#c4b5fd]">{profile.name}</span>
            </h2>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Mês anterior"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>

          <div className="px-3 text-xs font-bold text-white min-w-[130px] text-center uppercase tracking-wide">
            {MONTHS_PT[selectedMonthIndex]} {selectedYear}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Próximo mês"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Hero Financial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card Principal: Saldo Pessoal */}
        <div className="md:col-span-3 lg:col-span-3 relative overflow-hidden rounded-[32px] p-6 sm:p-7 bg-gradient-to-b from-[#1c1533] via-[#140e26] to-[#0d0a18] border border-[#7C3AED]/35 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED]/20 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9333ea]/15 rounded-full filter blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c4b5fd] text-base">
                  account_balance_wallet
                </span>
                <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
                  Saldo Pessoal ({MONTHS_PT[selectedMonthIndex]})
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    saldoPessoal >= 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {saldoPessoal >= 0 ? 'Positivo' : 'Negativo'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.6)] ${
                    saldoPessoal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatBRL(saldoPessoal)}
                </span>
              </div>

              <p className="text-xs text-zinc-400 max-w-md font-medium">
                {saldoPessoal >= 0
                  ? 'Você está com saldo positivo neste mês em suas contas e finanças pessoais.'
                  : 'Suas despesas pessoais superaram as receitas no período selecionado.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-black text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-[0_4px_20px_rgba(124,58,237,0.5)] hover:shadow-[0_8px_30px_rgba(124,58,237,0.7)] hover:-translate-y-0.5 cursor-pointer border border-[#c4b5fd]/40 select-none shrink-0"
              >
                <span className="material-symbols-outlined text-xl font-bold">add_circle</span>
                <span>+ Lançar Movimentação</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card Secundário 1: Entrou */}
        <div className="rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-emerald-500/20 backdrop-blur-xl shadow-lg relative overflow-hidden flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Entrou no Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <span className="material-symbols-outlined text-lg font-bold">arrow_downward</span>
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {formatBRL(totalEntradas)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              Salários, Freelas e Rendas
            </span>
          </div>
        </div>

        {/* Card Secundário 2: Saiu */}
        <div className="rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-rose-500/20 backdrop-blur-xl shadow-lg relative overflow-hidden flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Saiu no Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
              <span className="material-symbols-outlined text-lg font-bold">arrow_upward</span>
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
              {formatBRL(totalSaidas)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              Alimentação, Moradia e Contas
            </span>
          </div>
        </div>

        {/* Card Secundário 3: Resumo Mensal CTA */}
        <div 
          onClick={() => onNavigateToTab('resumo')}
          className="rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-primary/20 hover:border-[#7C3AED]/40 backdrop-blur-xl shadow-lg relative overflow-hidden flex flex-col justify-between gap-4 cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Análise & Insights
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd] group-hover:scale-110 transition-transform">
              <PieChart className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-base font-black text-white group-hover:text-[#c4b5fd] transition-colors flex items-center gap-1.5">
              <span>Ver Resumo Completo</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              Top categorias, economia e comparativo
            </span>
          </div>
        </div>

      </div>

      {/* Recorrências Alert Banner if upcoming */}
      {upcomingRecs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-[28px] bg-gradient-to-r from-amber-500/15 via-[#181228] to-[#120d20] border border-amber-500/30 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                  Cobrança Próxima
                </span>
                <span className="text-xs font-bold text-white">
                  {upcomingRecs[0].descricao} ({formatBRL(upcomingRecs[0].valor)})
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Vence em {new Date(upcomingRecs[0].proxima_data + 'T12:00:00').toLocaleDateString('pt-BR')} • {upcomingRecs[0].categoria}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => handleQuickLancarRec(upcomingRecs[0])}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer hover:brightness-110 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Lançar agora</span>
            </button>
            <button
              onClick={() => onNavigateToTab('recorrencias')}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300"
            >
              Ver todas ({recorrencias.length})
            </button>
          </div>
        </div>
      )}

      {/* Orçamentos & Metas Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Widget 1: Orçamentos Mensais */}
        <div className="rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-white/5 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/35 flex items-center justify-center text-[#c4b5fd]">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Orçamentos do Mês</h4>
                <span className="text-[10px] text-zinc-500 font-semibold">Limites por categoria</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('orcamentos')}
              className="text-xs font-bold text-[#c4b5fd] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Gerenciar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {orcamentos.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              Nenhum orçamento configurado ainda.
              <button
                onClick={() => onNavigateToTab('orcamentos')}
                className="block mx-auto mt-2 text-[#c4b5fd] font-bold"
              >
                + Definir limites de gastos
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-zinc-400 font-medium">
                  {formatBRL(totalGastoOrcado)} <span className="text-zinc-600">de</span> {formatBRL(totalOrcado)}
                </span>
                <span className={`font-black ${pctOrcado > 100 ? 'text-rose-400' : 'text-[#c4b5fd]'}`}>
                  {pctOrcado.toFixed(0)}% usado
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pctOrcado, 100)}%` }}
                  className={`h-full rounded-full ${
                    pctOrcado > 100 ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-[#7C3AED]'
                  }`}
                />
              </div>

              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1 border-t border-white/5">
                <span>{orcamentos.length} categorias monitoradas</span>
                <span className="text-zinc-300 font-semibold">
                  Restam {formatBRL(Math.max(0, totalOrcado - totalGastoOrcado))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Widget 2: Metas de Economia */}
        <div className="rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-white/5 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Metas de Economia</h4>
                <span className="text-[10px] text-zinc-500 font-semibold">Sonhos e reservas</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('metas')}
              className="text-xs font-bold text-[#c4b5fd] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeMetas.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              Nenhuma meta ativa no momento.
              <button
                onClick={() => onNavigateToTab('metas')}
                className="block mx-auto mt-2 text-emerald-400 font-bold"
              >
                + Criar meta de economia
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeMetas.slice(0, 2).map((m) => {
                const pct = m.valor_alvo > 0 ? (m.valor_atual / m.valor_alvo) * 100 : 0;
                return (
                  <div key={m.id} className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.cor || '#7C3AED' }} />
                        <span>{m.nome}</span>
                      </div>
                      <span className="font-extrabold text-emerald-400">{formatBRL(m.valor_atual)}</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: m.cor || '#7C3AED' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Feed de Últimas Movimentações */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] uppercase tracking-[0.5px] text-zinc-400 font-semibold">
            Últimos Lançamentos Pessoais
          </span>

          {monthTransactions.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateToTab('historico')}
              className="text-xs font-bold text-[#c4b5fd] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver todas</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          )}
        </div>

        {/* Lista Compacta */}
        {recentTransactions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-black/20 rounded-2xl border border-white/5">
            <div className="w-14 h-14 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/25 flex items-center justify-center text-[#c4b5fd]">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-white">Nenhum lançamento em {MONTHS_PT[selectedMonthIndex]}</h4>
              <p className="text-xs text-zinc-500 max-w-xs">
                Sua Conta Pessoal está pronta e zerada. Adicione sua primeira despesa ou receita.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#8b4bf0] text-white font-bold text-xs transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] cursor-pointer"
            >
              + Lançar Primeiro Registro
            </button>
          </div>
        ) : (
          <div className="bg-[#141022]/90 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-sm">
            {recentTransactions.map((tx) => {
              const txDate = new Date(tx.date + 'T12:00:00');
              const formattedDate = txDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTxForDetail(tx)}
                  className="h-16 px-4 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'entrada' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {tx.type === 'entrada' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-white truncate">
                        {tx.title}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                        {tx.category} • {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span
                      className={`text-sm font-extrabold tracking-tight ${
                        tx.type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'entrada' ? '+' : '-'} {formatBRL(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Detail Bottom Sheet (Progressive Disclosure) */}
      <TransactionDetailSheet
        transaction={selectedTxForDetail}
        isOpen={Boolean(selectedTxForDetail)}
        onClose={() => setSelectedTxForDetail(null)}
        userId={userId}
        onEdit={(tx) => {
          if (onEditTransaction) {
            onEditTransaction(tx);
          } else {
            onNavigateToTab('historico');
          }
        }}
        onDelete={(id) => {
          if (onDeleteTransaction) {
            onDeleteTransaction(id);
          }
        }}
      />

    </div>
  );
}
