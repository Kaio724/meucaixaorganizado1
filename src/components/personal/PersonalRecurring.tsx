import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Repeat, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  X, 
  Play, 
  SkipForward, 
  AlertCircle, 
  Check, 
  ToggleLeft, 
  ToggleRight 
} from 'lucide-react';
import { RecorrenciaPessoal, Transaction, UserProfile } from '../../types';
import { 
  fetchRecorrencias, 
  saveRecorrencia, 
  deleteRecorrencia, 
  computeNextDate 
} from '../../lib/personalData';
import { 
  getCombinedPersonalCategories, 
  getPersonalCategoryInfo 
} from '../../lib/personalCategories';

interface PersonalRecurringProps {
  profile: UserProfile;
  userId: string;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  onNavigateToTab?: (tab: any) => void;
}

export default function PersonalRecurring({
  profile,
  userId,
  onAddTransaction,
  onNavigateToTab
}: PersonalRecurringProps) {
  const [recorrencias, setRecorrencias] = useState<RecorrenciaPessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabFilter, setActiveTabFilter] = useState<'todas' | 'proximas' | 'entradas' | 'saidas'>('todas');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Create / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingRec, setEditingRec] = useState<RecorrenciaPessoal | null>(null);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [frequencia, setFrequencia] = useState<'semanal' | 'quinzenal' | 'mensal'>('mensal');
  const [diaCobranca, setDiaCobranca] = useState<number>(new Date().getDate());
  const [formaPagamento, setFormaPagamento] = useState('Cartão de Crédito');
  const [proximaData, setProximaData] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchRecorrencias(userId);
      setRecorrencias(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingRec(null);
    setTipo('saida');
    setDescricao('');
    setValor('');
    const cats = getCombinedPersonalCategories(userId).filter(c => c.type === 'saida');
    setCategoria(cats[0]?.name || 'Assinaturas');
    setFrequencia('mensal');
    setDiaCobranca(new Date().getDate());
    setFormaPagamento('Cartão de Crédito');
    setProximaData(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: RecorrenciaPessoal) => {
    setEditingRec(rec);
    setTipo(rec.tipo);
    setDescricao(rec.descricao);
    setValor(rec.valor.toString());
    setCategoria(rec.categoria);
    setFrequencia(rec.frequencia);
    setDiaCobranca(rec.dia_cobranca || new Date().getDate());
    setFormaPagamento(rec.forma_pagamento || 'Cartão de Crédito');
    setProximaData(rec.proxima_data);
    setFormError(null);
    setShowModal(true);
  };

  // Save Recorrencia
  const handleSaveRecorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setFormError('Informe a descrição da recorrência.');
      return;
    }
    const val = parseFloat(valor.replace(',', '.'));
    if (!val || isNaN(val) || val <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    try {
      await saveRecorrencia(userId, {
        id: editingRec?.id,
        tipo,
        descricao: descricao.trim(),
        valor: val,
        categoria: categoria || 'Outros',
        frequencia,
        dia_cobranca: frequencia === 'mensal' ? diaCobranca : undefined,
        forma_pagamento: formaPagamento,
        proxima_data: proximaData,
        ativo: editingRec ? editingRec.ativo : true
      });

      setShowModal(false);
      showToast(editingRec ? 'Recorrência atualizada!' : 'Recorrência cadastrada!');
      await loadData();
    } catch (err) {
      setFormError('Erro ao salvar recorrência.');
    }
  };

  // Action: "Lançar agora"
  const handleLancarAgora = async (rec: RecorrenciaPessoal) => {
    try {
      // 1. Create personal transaction
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

      // 2. Advance proxima_data
      const nextDate = computeNextDate(rec.proxima_data, rec.frequencia, rec.dia_cobranca);
      await saveRecorrencia(userId, {
        ...rec,
        proxima_data: nextDate
      });

      showToast(`Lançamento de ${formatBRL(rec.valor)} realizado! Próxima data: ${new Date(nextDate + 'T12:00:00').toLocaleDateString('pt-BR')}`);
      await loadData();
    } catch (e) {
      console.warn(e);
      showToast('Erro ao realizar lançamento.');
    }
  };

  // Action: "Pular"
  const handlePular = async (rec: RecorrenciaPessoal) => {
    try {
      const nextDate = computeNextDate(rec.proxima_data, rec.frequencia, rec.dia_cobranca);
      await saveRecorrencia(userId, {
        ...rec,
        proxima_data: nextDate
      });
      showToast(`Cobrança pulada. Nova data: ${new Date(nextDate + 'T12:00:00').toLocaleDateString('pt-BR')}`);
      await loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  // Toggle active / paused
  const handleToggleActive = async (rec: RecorrenciaPessoal) => {
    try {
      await saveRecorrencia(userId, {
        ...rec,
        ativo: !rec.ativo
      });
      showToast(rec.ativo ? 'Recorrência pausada.' : 'Recorrência reativada.');
      await loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteRecorrencia(userId, deletingId);
      setDeletingId(null);
      showToast('Recorrência excluída.');
      await loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  // Filtered list
  const filteredRecorrencias = recorrencias.filter(r => {
    if (activeTabFilter === 'entradas') return r.tipo === 'entrada';
    if (activeTabFilter === 'saidas') return r.tipo === 'saida';
    if (activeTabFilter === 'proximas') {
      const target = new Date(r.proxima_data + 'T12:00:00').getTime();
      const now = new Date().getTime();
      const diffDays = (target - now) / (1000 * 60 * 60 * 24);
      return diffDays <= 7 && r.ativo;
    }
    return true;
  });

  // KPI calculations
  const totalSaidasRecorrentes = recorrencias.filter(r => r.ativo && r.tipo === 'saida').reduce((sum, r) => sum + r.valor, 0);
  const totalEntradasRecorrentes = recorrencias.filter(r => r.ativo && r.tipo === 'entrada').reduce((sum, r) => sum + r.valor, 0);

  const availableCategories = getCombinedPersonalCategories(userId).filter(c => c.type === tipo);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 text-left pb-24">
      
      {/* Toast Notification */}
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171228]/90 to-[#100c1e]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/35 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#c4b5fd] uppercase tracking-wider bg-[#7C3AED]/15 px-2 py-0.5 rounded-full border border-[#7C3AED]/30">
                Conta Pessoal
              </span>
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                Despesas Fixas & Assinaturas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Recorrências
            </h2>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer border border-[#c4b5fd]/30"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Recorrência</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Saídas Fixas */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-rose-500/20 backdrop-blur-xl shadow-lg flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Despesas Fixas Mensais
            </span>
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatBRL(totalSaidasRecorrentes)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold">
              Assinaturas, aluguel, contas fixas ativas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Total Entradas Fixas */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-emerald-500/20 backdrop-blur-xl shadow-lg flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Receitas Fixas Mensais
            </span>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatBRL(totalEntradasRecorrentes)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold">
              Salário, pró-labore, rendimentos fixos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto w-fit">
        <button
          onClick={() => setActiveTabFilter('todas')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTabFilter === 'todas'
              ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Todas ({recorrencias.length})
        </button>
        <button
          onClick={() => setActiveTabFilter('proximas')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTabFilter === 'proximas'
              ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Próximos 7 dias
        </button>
        <button
          onClick={() => setActiveTabFilter('saidas')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTabFilter === 'saidas'
              ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Saídas ({recorrencias.filter(r => r.tipo === 'saida').length})
        </button>
        <button
          onClick={() => setActiveTabFilter('entradas')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTabFilter === 'entradas'
              ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Entradas ({recorrencias.filter(r => r.tipo === 'entrada').length})
        </button>
      </div>

      {/* Recurrences List */}
      <div>
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-zinc-400">Carregando recorrências...</span>
          </div>
        ) : filteredRecorrencias.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-4 bg-[#140f24]/80 rounded-[32px] border border-white/5">
            <div className="w-16 h-16 rounded-3xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_24px_rgba(124,58,237,0.3)]">
              <Repeat className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-sm">
              <h3 className="text-base font-black text-white">Nenhuma recorrência cadastrada</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                Cadastre suas assinaturas (Netflix, Spotify, Academia) e despesas fixas (Aluguel, Luz) para automatizar seus lançamentos.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer border border-[#c4b5fd]/30"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeira Recorrência</span>
            </button>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecorrencias.map((rec) => {
              const catInfo = getPersonalCategoryInfo(rec.categoria, rec.tipo, userId);
              const isEntrada = rec.tipo === 'entrada';

              // Date status
              const targetDate = new Date(rec.proxima_data + 'T12:00:00');
              const now = new Date();
              const todayStr = now.toISOString().split('T')[0];
              const isToday = rec.proxima_data === todayStr;
              const diffTime = targetDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isLate = diffDays < 0;

              let badgeText = `Em ${diffDays} dias`;
              let badgeColor = 'bg-white/5 text-zinc-300 border-white/10';

              if (isToday) {
                badgeText = 'Hoje!';
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
              } else if (isLate) {
                badgeText = `Atrasada (${targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;
                badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              } else if (diffDays <= 3) {
                badgeText = `Em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
                badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
              }

              return (
                <div
                  key={rec.id}
                  className={`rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-white/5 hover:border-[#7C3AED]/40 backdrop-blur-xl shadow-lg transition-all duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden ${
                    !rec.ativo ? 'opacity-60 grayscale-[40%]' : ''
                  }`}
                >
                  {/* Top: Category + Name + Value */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${catInfo.bgColor}`}>
                        <span className={`material-symbols-outlined text-xl ${catInfo.color}`}>
                          {catInfo.icon}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-white group-hover:text-[#c4b5fd] transition-colors">
                            {rec.descricao}
                          </h4>
                          {!rec.ativo && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10">
                              Pausada
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {rec.categoria} • {rec.frequencia === 'mensal' ? `Todo dia ${rec.dia_cobranca || 10}` : rec.frequencia}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-base sm:text-lg font-black tracking-tight ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isEntrada ? '+' : '-'} {formatBRL(rec.valor)}
                      </div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">
                        {rec.forma_pagamento || 'Pix'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Next Charge Indicator & Status */}
                  <div className="flex items-center justify-between py-2 border-y border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-zinc-400 font-semibold">Próxima:</span>
                      <span className="text-white font-bold">
                        {targetDate.toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>

                  {/* Bottom Actions: Lançar Agora & Pular */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLancarAgora(rec)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                        title="Criar lançamento agora e agendar próximo mês"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Lançar agora</span>
                      </button>

                      <button
                        onClick={() => handlePular(rec)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                        title="Pular esta cobrança sem lançar"
                      >
                        <SkipForward className="w-3 h-3" />
                        <span>Pular</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(rec)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title={rec.ativo ? 'Pausar recorrência' : 'Ativar recorrência'}
                      >
                        {rec.ativo ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-zinc-500" />}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(rec)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(rec.id)}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT RECURRENCE MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md bg-[#161224] border-t sm:border border-primary/30 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd]">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingRec ? 'Editar Recorrência' : 'Nova Recorrência'}
                    </h3>
                    <p className="text-[11px] text-zinc-400">Automatize cobranças periódicas</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRecorrencia} className="p-6 overflow-y-auto flex flex-col gap-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300">
                    {formError}
                  </div>
                )}

                {/* Tipo: Entrada vs Saída */}
                <div className="flex rounded-2xl bg-black/40 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setTipo('saida');
                      const cats = getCombinedPersonalCategories(userId).filter(c => c.type === 'saida');
                      setCategoria(cats[0]?.name || 'Assinaturas');
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      tipo === 'saida'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Saída / Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipo('entrada');
                      const cats = getCombinedPersonalCategories(userId).filter(c => c.type === 'entrada');
                      setCategoria(cats[0]?.name || 'Salário');
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      tipo === 'entrada'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Entrada / Receita
                  </button>
                </div>

                {/* Descrição */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Descrição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Netflix, Aluguel, Salário, Internet..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-base sm:text-sm font-bold text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                    autoFocus
                  />
                </div>

                {/* Valor & Categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Valor (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-zinc-400 font-bold text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-base sm:text-sm font-black text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Categoria
                    </label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] scheme-dark"
                    >
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.name} className="bg-[#161224] text-white">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Frequência & Dia de Cobrança */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Frequência
                    </label>
                    <select
                      value={frequencia}
                      onChange={(e) => setFrequencia(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] scheme-dark"
                    >
                      <option value="mensal" className="bg-[#161224]">Mensal</option>
                      <option value="quinzenal" className="bg-[#161224]">Quinzenal</option>
                      <option value="semanal" className="bg-[#161224]">Semanal</option>
                    </select>
                  </div>

                  {frequencia === 'mensal' ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Dia da Cobrança (1 a 31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={diaCobranca}
                        onChange={(e) => setDiaCobranca(parseInt(e.target.value) || 1)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-base sm:text-sm font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Primeira Data
                      </label>
                      <input
                        type="date"
                        value={proximaData}
                        onChange={(e) => setProximaData(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] scheme-dark"
                      />
                    </div>
                  )}
                </div>

                {/* Forma de Pagamento */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] scheme-dark"
                  >
                    <option value="Cartão de Crédito" className="bg-[#161224]">Cartão de Crédito</option>
                    <option value="Pix" className="bg-[#161224]">Pix</option>
                    <option value="Débito Automático" className="bg-[#161224]">Débito Automático</option>
                    <option value="Boleto" className="bg-[#161224]">Boleto</option>
                    <option value="Dinheiro" className="bg-[#161224]">Dinheiro</option>
                  </select>
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
                    {editingRec ? 'Salvar Alterações' : 'Cadastrar Recorrência'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
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
                <h3 className="text-base font-black text-white">Excluir Recorrência?</h3>
                <p className="text-xs text-zinc-400">
                  Os lançamentos que já foram realizados no seu histórico permanecerão salvos.
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
