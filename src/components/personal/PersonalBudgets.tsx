import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PiggyBank, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  ArrowRight
} from 'lucide-react';
import { OrcamentoPessoal, Transaction, UserProfile } from '../../types';
import { 
  fetchOrcamentos, 
  saveOrcamento, 
  deleteOrcamento 
} from '../../lib/personalData';
import { 
  getCombinedPersonalCategories, 
  getPersonalCategoryInfo 
} from '../../lib/personalCategories';

interface PersonalBudgetsProps {
  profile: UserProfile;
  userId: string;
  transactions: Transaction[];
  onNavigateToTab?: (tab: any) => void;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function PersonalBudgets({
  profile,
  userId,
  transactions,
  onNavigateToTab
}: PersonalBudgetsProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const [orcamentos, setOrcamentos] = useState<OrcamentoPessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingOrcamento, setEditingOrcamento] = useState<OrcamentoPessoal | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [valorLimite, setValorLimite] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchOrcamentos(userId, selectedMonth, selectedYear);
      setOrcamentos(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  // Filter personal expense transactions for this month/year
  const personalExpenses = transactions.filter(t => {
    if (t.accountType !== 'pessoal' || t.type !== 'saida') return false;
    const d = new Date(t.date + 'T12:00:00');
    return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Calculate spent per category
  const getSpentForCategory = (catName: string) => {
    return personalExpenses
      .filter(t => t.category.toLowerCase().trim() === catName.toLowerCase().trim())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Summary calculations
  const totalOrcado = orcamentos.reduce((sum, o) => sum + o.valor_limite, 0);
  const totalGastoOrcado = orcamentos.reduce((sum, o) => sum + getSpentForCategory(o.categoria_nome), 0);
  const categoriasNoLimiteCount = orcamentos.filter(o => {
    const spent = getSpentForCategory(o.categoria_nome);
    const pct = o.valor_limite > 0 ? (spent / o.valor_limite) * 100 : 0;
    return pct >= 80;
  }).length;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  // Open modal for new
  const handleOpenNewModal = () => {
    setEditingOrcamento(null);
    const saidaCategories = getCombinedPersonalCategories(userId).filter(c => c.type === 'saida');
    const existingCatNames = orcamentos.map(o => o.categoria_nome.toLowerCase());
    const available = saidaCategories.find(c => !existingCatNames.includes(c.name.toLowerCase()));
    setCategoryName(available ? available.name : (saidaCategories[0]?.name || 'Alimentação'));
    setValorLimite('');
    setModalError(null);
    setShowModal(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (orc: OrcamentoPessoal) => {
    setEditingOrcamento(orc);
    setCategoryName(orc.categoria_nome);
    setValorLimite(orc.valor_limite.toString());
    setModalError(null);
    setShowModal(true);
  };

  // Handle Save
  const handleSaveOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorLimite.replace(',', '.'));
    if (!val || isNaN(val) || val <= 0) {
      setModalError('Informe um valor limite válido maior que zero.');
      return;
    }
    if (!categoryName) {
      setModalError('Selecione uma categoria de saída.');
      return;
    }

    try {
      await saveOrcamento(userId, {
        id: editingOrcamento?.id,
        categoria_nome: categoryName,
        valor_limite: val,
        mes: selectedMonth,
        ano: selectedYear
      });

      setShowModal(false);
      showToast(editingOrcamento ? 'Orçamento atualizado com sucesso!' : 'Orçamento criado com sucesso!');
      await loadData();
    } catch (err) {
      setModalError('Erro ao salvar orçamento. Tente novamente.');
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteOrcamento(userId, deletingId);
      setDeletingId(null);
      showToast('Orçamento excluído.');
      await loadData();
    } catch (err) {
      console.warn(err);
    }
  };

  const saidaCategories = getCombinedPersonalCategories(userId).filter(c => c.type === 'saida');

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 text-left pb-24">
      
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 bg-[#181428] border border-[#7C3AED]/40 rounded-2xl text-xs font-bold text-white shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Month Selector & CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171228]/90 to-[#100c1e]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/35 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#c4b5fd] uppercase tracking-wider bg-[#7C3AED]/15 px-2 py-0.5 rounded-full border border-[#7C3AED]/30">
                Conta Pessoal
              </span>
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                Limites por Categoria
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Orçamentos Mensais
            </h2>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-bold text-white min-w-[125px] text-center uppercase tracking-wide">
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

          {/* + Novo Orçamento Button */}
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer border border-[#c4b5fd]/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Novo Orçamento</span>
            <span className="sm:hidden">+ Novo</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Orçado */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-primary/20 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Total Orçado no Mês
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatBRL(totalOrcado)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              Soma de todos os limites ativos
            </span>
          </div>
        </div>

        {/* Total Gasto Dentro dos Orçamentos */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-amber-500/20 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Total Gasto
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              {formatBRL(totalGastoOrcado)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              {totalOrcado > 0 ? `${((totalGastoOrcado / totalOrcado) * 100).toFixed(0)}% do limite global usado` : 'Nenhum limite definido'}
            </span>
          </div>
        </div>

        {/* Categorias no Limite */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-rose-500/20 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Categorias em Alerta
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {categoriasNoLimiteCount}{' '}
              <span className="text-sm font-bold text-zinc-400">
                {categoriasNoLimiteCount === 1 ? 'categoria' : 'categorias'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              Acima de 80% do valor limite
            </span>
          </div>
        </div>
      </div>

      {/* Main Budgets List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-zinc-400">Carregando orçamentos...</span>
          </div>
        ) : orcamentos.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-4 bg-[#140f24]/80 rounded-[32px] border border-white/5">
            <div className="w-16 h-16 rounded-3xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_24px_rgba(124,58,237,0.3)]">
              <PiggyBank className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-sm">
              <h3 className="text-base font-black text-white">Você ainda não tem orçamentos definidos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                Defina tetos de gastos para Alimentação, Moradia, Lazer e receba alertas inteligentes antes de estourar o mês.
              </p>
            </div>
            <button
              onClick={handleOpenNewModal}
              className="mt-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer border border-[#c4b5fd]/30"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeiro Orçamento</span>
            </button>
          </div>
        ) : (
          /* List of Budget Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orcamentos.map((orc) => {
              const spent = getSpentForCategory(orc.categoria_nome);
              const limit = orc.valor_limite;
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              const isOver = pct > 100;
              const isWarning = pct >= 80 && !isOver;

              // Visual Progress Color Logic
              // Verde #10B981 (abaixo 60%)
              // Amarelo #F59E0B (60% a 80%)
              // Vermelho #EF4444 (acima 80%)
              let fillColor = '#10B981';
              let glowColor = 'rgba(16, 185, 129, 0.4)';
              let statusLabel = 'No controle';
              let statusBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

              if (pct >= 80) {
                fillColor = '#EF4444';
                glowColor = 'rgba(239, 68, 68, 0.4)';
                if (isOver) {
                  statusLabel = '🚨 Estourado';
                  statusBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
                } else {
                  statusLabel = '⚠️ Atenção';
                  statusBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                }
              } else if (pct >= 60) {
                fillColor = '#F59E0B';
                glowColor = 'rgba(245, 158, 11, 0.4)';
                statusLabel = 'Moderado';
                statusBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
              }

              const catInfo = getPersonalCategoryInfo(orc.categoria_nome, 'saida', userId);

              return (
                <div
                  key={orc.id}
                  className="rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-white/5 hover:border-[#7C3AED]/40 backdrop-blur-xl shadow-lg transition-all duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
                >
                  {/* Top line with Category & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${catInfo.bgColor}`}>
                        <span className={`material-symbols-outlined text-xl ${catInfo.color}`}>
                          {catInfo.icon}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-[#c4b5fd] transition-colors">
                          {orc.categoria_nome}
                        </h4>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          Limite mensal para saídas
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                      
                      {/* Action buttons */}
                      <button
                        onClick={() => handleOpenEditModal(orc)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Editar limite"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(orc.id)}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Excluir orçamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Numbers */}
                  <div className="flex items-baseline justify-between text-xs sm:text-sm">
                    <span className="font-extrabold text-white">
                      <span className={pct > 100 ? 'text-rose-400' : 'text-zinc-200'}>
                        {formatBRL(spent)}
                      </span>{' '}
                      <span className="text-zinc-500 font-normal">de</span>{' '}
                      <span className="text-zinc-300 font-bold">{formatBRL(limit)}</span>
                    </span>

                    <span 
                      className="font-black text-xs sm:text-sm tracking-tight"
                      style={{ color: fillColor }}
                    >
                      {pct.toFixed(0)}% usado
                    </span>
                  </div>

                  {/* Progress Bar with Dynamic Glow */}
                  <div className="w-full h-2.5 rounded-full bg-[#7C3AED]/15 overflow-hidden p-0.5 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: fillColor,
                        boxShadow: `0 0 8px ${glowColor}`
                      }}
                    />
                  </div>

                  {/* Bottom Insight / Advice */}
                  <div className="text-[11px] font-medium text-zinc-400 flex items-center justify-between pt-1 border-t border-white/5">
                    {isOver ? (
                      <span className="text-rose-400 font-semibold">
                        Atenção: você ultrapassou o orçamento em {formatBRL(spent - limit)} este mês.
                      </span>
                    ) : (
                      <span>
                        Restam <strong className="text-zinc-200">{formatBRL(Math.max(0, limit - spent))}</strong> disponíveis
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT ORÇAMENTO MODAL (Bottom Sheet in Mobile) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md bg-[#161224] border-t sm:border border-primary/30 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Drag Handle Mobile */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd]">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {MONTHS_PT[selectedMonth - 1]} de {selectedYear}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveOrcamento} className="p-6 flex flex-col gap-4">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300">
                    {modalError}
                  </div>
                )}

                {/* Categoria */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Categoria Pessoal (Saídas)
                  </label>
                  <select
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    disabled={!!editingOrcamento}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] scheme-dark"
                  >
                    {saidaCategories.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#161224] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor Limite */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Valor Limite Mensal (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-zinc-400 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={valorLimite}
                      onChange={(e) => setValorLimite(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-base sm:text-sm font-black text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                      autoFocus
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Você receberá alertas inteligentes ao atingir 80% e 100% desse valor.
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] text-white text-xs font-black shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer"
                  >
                    {editingOrcamento ? 'Salvar Alterações' : 'Criar Orçamento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#161224] border border-rose-500/30 rounded-3xl p-6 flex flex-col gap-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-black text-white">Excluir Orçamento?</h3>
                <p className="text-xs text-zinc-400">
                  Tem certeza de que deseja remover este orçamento? Os lançamentos dessa categoria continuarão intactos.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black shadow-[0_4px_16px_rgba(239,68,68,0.4)] cursor-pointer"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
