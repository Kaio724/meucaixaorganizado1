import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  X, 
  History, 
  AlertTriangle,
  Plane,
  Car,
  Home,
  Smartphone,
  GraduationCap,
  Heart,
  Star,
  Gift,
  Umbrella,
  Music,
  Shield,
  Laptop,
  Coffee,
  ShoppingBag,
  TrendingUp,
  Trophy,
  Calendar,
  RotateCcw,
  Check,
  Ban
} from 'lucide-react';
import { MetaPessoal, ReservaMeta, UserProfile } from '../../types';
import { 
  fetchMetas, 
  saveMeta, 
  deleteMeta, 
  fetchReservasByMeta, 
  addReservaMeta, 
  deleteReservaMeta 
} from '../../lib/personalData';

interface PersonalGoalsProps {
  profile: UserProfile;
  userId: string;
  onNavigateToTab?: (tab: any) => void;
}

// Icon dictionary for selection
const GOAL_ICONS: { [key: string]: React.ComponentType<any> } = {
  plane: Plane,
  car: Car,
  home: Home,
  smartphone: Smartphone,
  'graduation-cap': GraduationCap,
  heart: Heart,
  star: Star,
  gift: Gift,
  umbrella: Umbrella,
  music: Music,
  shield: Shield,
  laptop: Laptop,
  coffee: Coffee,
  'shopping-bag': ShoppingBag,
  target: Target,
  trophy: Trophy
};

// 8 MCO aesthetic color palette
const GOAL_COLORS = [
  '#7C3AED', // MCO Purple / Violet
  '#10B981', // Emerald Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#8B5CF6', // Light Purple
  '#14B8A6'  // Teal
];

export default function PersonalGoals({
  profile,
  userId,
  onNavigateToTab
}: PersonalGoalsProps) {
  const [metas, setMetas] = useState<MetaPessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'ativas' | 'concluida' | 'cancelada'>('ativas');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal: Create / Edit Meta
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaPessoal | null>(null);
  const [nome, setNome] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [prazo, setPrazo] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [selectedColor, setSelectedColor] = useState('#7C3AED');
  const [formError, setFormError] = useState<string | null>(null);

  // Modal: Adicionar Reserva
  const [reservaTargetMeta, setReservaTargetMeta] = useState<MetaPessoal | null>(null);
  const [reservaValor, setReservaValor] = useState('');
  const [reservaData, setReservaData] = useState(new Date().toISOString().split('T')[0]);
  const [reservaDescricao, setReservaDescricao] = useState('');
  const [reservaError, setReservaError] = useState<string | null>(null);

  // Modal: Histórico de Reservas
  const [historyTargetMeta, setHistoryTargetMeta] = useState<MetaPessoal | null>(null);
  const [reservasHistory, setReservasHistory] = useState<ReservaMeta[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal: Celebração de Meta Concluída 🎉
  const [celebrationMeta, setCelebrationMeta] = useState<MetaPessoal | null>(null);

  // Modal: Confirmação de exclusão
  const [deletingMetaId, setDeletingMetaId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMetas(userId);
      setMetas(data);
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

  // Trigger Confetti Celebration
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7C3AED', '#10B981', '#F59E0B', '#c4b5fd', '#38bdf8']
      });
    } catch (e) {}
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingMeta(null);
    setNome('');
    setValorAlvo('');
    setPrazo('');
    setSelectedIcon('target');
    setSelectedColor('#7C3AED');
    setFormError(null);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (meta: MetaPessoal) => {
    setEditingMeta(meta);
    setNome(meta.nome);
    setValorAlvo(meta.valor_alvo.toString());
    setPrazo(meta.prazo || '');
    setSelectedIcon(meta.icone || 'target');
    setSelectedColor(meta.cor || '#7C3AED');
    setFormError(null);
    setShowCreateModal(true);
  };

  // Save Meta
  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFormError('Informe o nome da meta.');
      return;
    }
    const val = parseFloat(valorAlvo.replace(',', '.'));
    if (!val || isNaN(val) || val <= 0) {
      setFormError('Informe um valor alvo válido maior que zero.');
      return;
    }

    try {
      await saveMeta(userId, {
        id: editingMeta?.id,
        nome: nome.trim(),
        valor_alvo: val,
        valor_atual: editingMeta?.valor_atual || 0,
        prazo: prazo || null,
        icone: selectedIcon,
        cor: selectedColor,
        status: editingMeta?.status || 'ativa'
      });

      setShowCreateModal(false);
      showToast(editingMeta ? 'Meta atualizada com sucesso!' : 'Meta criada com sucesso!');
      await loadData();
    } catch (err) {
      setFormError('Erro ao salvar meta. Tente novamente.');
    }
  };

  // Open Reserva Modal
  const handleOpenReservaModal = (meta: MetaPessoal) => {
    setReservaTargetMeta(meta);
    setReservaValor('');
    setReservaData(new Date().toISOString().split('T')[0]);
    setReservaDescricao('');
    setReservaError(null);
  };

  // Save Reserva (Add aporte)
  const handleSaveReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservaTargetMeta) return;

    const val = parseFloat(reservaValor.replace(',', '.'));
    if (!val || isNaN(val) || val <= 0) {
      setReservaError('Informe um valor de reserva válido maior que zero.');
      return;
    }

    try {
      const { updatedMeta } = await addReservaMeta(
        userId,
        {
          meta_id: reservaTargetMeta.id,
          valor: val,
          data: reservaData,
          descricao: reservaDescricao.trim() || undefined
        },
        reservaTargetMeta
      );

      setReservaTargetMeta(null);
      await loadData();

      // Check if completed
      if (updatedMeta.valor_atual >= updatedMeta.valor_alvo && updatedMeta.status === 'concluida') {
        triggerConfetti();
        setCelebrationMeta(updatedMeta);
      } else {
        showToast(`Reserva de ${formatBRL(val)} adicionada! 💚`);
      }
    } catch (err) {
      setReservaError('Erro ao adicionar reserva.');
    }
  };

  // Open History Modal
  const handleOpenHistoryModal = async (meta: MetaPessoal) => {
    setHistoryTargetMeta(meta);
    setLoadingHistory(true);
    try {
      const list = await fetchReservasByMeta(userId, meta.id);
      setReservasHistory(list);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Delete individual reserva in history
  const handleDeleteReserva = async (reservaId: string) => {
    if (!historyTargetMeta) return;
    try {
      const updatedMeta = await deleteReservaMeta(userId, reservaId, historyTargetMeta);
      setHistoryTargetMeta(updatedMeta);
      const list = await fetchReservasByMeta(userId, historyTargetMeta.id);
      setReservasHistory(list);
      showToast('Aporte removido.');
      await loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  // Status changes: Cancel, Reactivate, Conclude
  const handleChangeStatus = async (meta: MetaPessoal, newStatus: 'ativa' | 'concluida' | 'cancelada') => {
    try {
      await saveMeta(userId, { ...meta, status: newStatus });
      showToast(`Meta alterada para ${newStatus}.`);
      await loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  // Confirm delete meta
  const handleConfirmDeleteMeta = async () => {
    if (!deletingMetaId) return;
    try {
      await deleteMeta(userId, deletingMetaId);
      setDeletingMetaId(null);
      showToast('Meta excluída permanentemente.');
      await loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  // Filtered by subtab
  const filteredMetas = metas.filter(m => {
    if (activeSubTab === 'ativas') return m.status === 'ativa';
    if (activeSubTab === 'concluida') return m.status === 'concluida';
    if (activeSubTab === 'cancelada') return m.status === 'cancelada';
    return true;
  });

  // Calculate overall stats
  const totalAlvoAtivas = metas.filter(m => m.status === 'ativa').reduce((sum, m) => sum + m.valor_alvo, 0);
  const totalAtualAtivas = metas.filter(m => m.status === 'ativa').reduce((sum, m) => sum + m.valor_atual, 0);
  const totalConcluidasCount = metas.filter(m => m.status === 'concluida').length;

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

      {/* Header with Hero Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171228]/90 to-[#100c1e]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/35 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#c4b5fd] uppercase tracking-wider bg-[#7C3AED]/15 px-2 py-0.5 rounded-full border border-[#7C3AED]/30">
                Conta Pessoal
              </span>
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                Economia & Sonhos
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Minhas Metas
            </h2>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer border border-[#c4b5fd]/30"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Meta</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Acumulado em Metas */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-primary/20 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Total Acumulado
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatBRL(totalAtualAtivas)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              Guardados para suas metas ativas
            </span>
          </div>
        </div>

        {/* Total Alvo */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-white/5 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Objetivo Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatBRL(totalAlvoAtivas)}
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              {totalAlvoAtivas > 0 ? `${((totalAtualAtivas / totalAlvoAtivas) * 100).toFixed(0)}% do objetivo alcançado` : 'Nenhuma meta ativa'}
            </span>
          </div>
        </div>

        {/* Metas Concluídas */}
        <div className="p-5 rounded-[24px] bg-[#140f24]/90 border border-amber-500/20 backdrop-blur-xl shadow-lg flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Metas Concluídas
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              {totalConcluidasCount}{' '}
              <span className="text-sm font-bold text-zinc-400">
                {totalConcluidasCount === 1 ? 'conquista' : 'conquistas'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 block">
              Sonhos realizados no MCO 🎉
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Ativas / Concluídas / Canceladas */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/5 w-fit">
        <button
          onClick={() => setActiveSubTab('ativas')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'ativas'
              ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Ativas ({metas.filter(m => m.status === 'ativa').length})
        </button>
        <button
          onClick={() => setActiveSubTab('concluida')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'concluida'
              ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Concluídas ({metas.filter(m => m.status === 'concluida').length})
        </button>
        <button
          onClick={() => setActiveSubTab('cancelada')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'cancelada'
              ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Canceladas ({metas.filter(m => m.status === 'cancelada').length})
        </button>
      </div>

      {/* Main Goals Grid */}
      <div>
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-zinc-400">Carregando suas metas...</span>
          </div>
        ) : filteredMetas.length === 0 ? (
          /* Empty state */
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-4 bg-[#140f24]/80 rounded-[32px] border border-white/5">
            <div className="w-16 h-16 rounded-3xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_24px_rgba(124,58,237,0.3)]">
              <Target className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-sm">
              <h3 className="text-base font-black text-white">
                {activeSubTab === 'ativas'
                  ? 'Você não tem metas ativas no momento'
                  : activeSubTab === 'concluida'
                  ? 'Nenhuma meta concluída ainda'
                  : 'Nenhuma meta cancelada'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {activeSubTab === 'ativas'
                  ? 'Crie uma meta para juntar dinheiro para uma viagem, reserva de emergência, eletrônicos ou reformas.'
                  : 'Suas metas finalizadas e celebradas aparecerão aqui.'}
              </p>
            </div>
            {activeSubTab === 'ativas' && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer border border-[#c4b5fd]/30"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeira Meta</span>
              </button>
            )}
          </div>
        ) : (
          /* Goals List */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMetas.map((meta) => {
              const metaColor = meta.cor || '#7C3AED';
              const IconComponent = GOAL_ICONS[meta.icone || 'target'] || Target;
              const pct = meta.valor_alvo > 0 ? (meta.valor_atual / meta.valor_alvo) * 100 : 0;
              const faltam = Math.max(0, meta.valor_alvo - meta.valor_atual);

              // Prazo Calculation
              let prazoDaysText: string | null = null;
              let isPrazoUrgent = false;
              if (meta.prazo) {
                const prazoDate = new Date(meta.prazo + 'T23:59:59');
                const diffTime = prazoDate.getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                  prazoDaysText = 'Prazo expirado';
                } else if (diffDays === 0) {
                  prazoDaysText = 'Prazo termina hoje!';
                  isPrazoUrgent = true;
                } else if (diffDays <= 7) {
                  prazoDaysText = `⚠️ Prazo em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
                  isPrazoUrgent = true;
                } else {
                  prazoDaysText = `${diffDays} dias restantes`;
                }
              }

              return (
                <div
                  key={meta.id}
                  className="rounded-[28px] p-5 sm:p-6 bg-[#130f21]/90 border border-white/5 hover:border-[#7C3AED]/40 backdrop-blur-xl shadow-lg transition-all duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden"
                >
                  {/* Left Color Accent Line (4px) */}
                  <div
                    className="absolute top-0 bottom-0 left-0 w-1.5"
                    style={{ backgroundColor: metaColor }}
                  />

                  {/* Top: Icon + Name + Actions */}
                  <div className="flex items-start justify-between gap-3 pl-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${metaColor}20`,
                          borderColor: `${metaColor}40`,
                          color: metaColor
                        }}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-[#c4b5fd] transition-colors line-clamp-1">
                          {meta.nome}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-semibold mt-0.5">
                          <span>Alvo: {formatBRL(meta.valor_alvo)}</span>
                          {meta.prazo && (
                            <>
                              <span>•</span>
                              <span className={isPrazoUrgent ? 'text-amber-400 font-bold' : ''}>
                                {prazoDaysText}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenHistoryModal(meta)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Ver histórico de reservas"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(meta)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Editar meta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {meta.status === 'ativa' && (
                        <button
                          onClick={() => handleChangeStatus(meta, 'cancelada')}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                          title="Cancelar meta"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {meta.status === 'cancelada' && (
                        <button
                          onClick={() => handleChangeStatus(meta, 'ativa')}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-emerald-500/15 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                          title="Reativar meta"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Numbers & Percent Highlight */}
                  <div className="flex items-baseline justify-between pl-1">
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {formatBRL(meta.valor_atual)}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        acumulado de {formatBRL(meta.valor_alvo)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className="text-lg sm:text-xl font-black tracking-tight"
                        style={{ color: metaColor }}
                      >
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        {faltam === 0 ? 'Concluída!' : `Faltam ${formatBRL(faltam)}`}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Progress Bar with Subtle Glow */}
                  <div className="w-full h-2.5 rounded-full bg-[#7C3AED]/15 overflow-hidden p-0.5 relative pl-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: metaColor,
                        boxShadow: `0 0 8px ${metaColor}80`
                      }}
                    />
                  </div>

                  {/* Main Action: Adicionar Reserva */}
                  {meta.status === 'ativa' && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 pl-1">
                      <button
                        onClick={() => handleOpenReservaModal(meta)}
                        className="w-full py-2.5 px-4 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-[0.98]"
                        style={{ backgroundColor: metaColor }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Reserva</span>
                      </button>
                    </div>
                  )}

                  {meta.status === 'concluida' && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between pl-1">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Meta Concluída com Sucesso!
                      </span>
                      <button
                        onClick={() => handleOpenHistoryModal(meta)}
                        className="text-[11px] font-bold text-zinc-400 hover:text-white"
                      >
                        Ver Histórico
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT META MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-lg bg-[#161224] border-t sm:border border-primary/30 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Drag Handle Mobile */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd]">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingMeta ? 'Editar Meta' : 'Nova Meta de Economia'}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Defina um valor alvo, prazo e personalize visualmente
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form & Live Preview */}
              <form onSubmit={handleSaveMeta} className="p-6 overflow-y-auto flex flex-col gap-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300">
                    {formError}
                  </div>
                )}

                {/* Nome da Meta */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Nome da Meta
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Viagem para o Nordeste, Notebook, Reserva..."
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-base sm:text-sm font-bold text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                    autoFocus
                  />
                </div>

                {/* Valor Alvo e Prazo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Valor Alvo (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-zinc-400 font-bold text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={valorAlvo}
                        onChange={(e) => setValorAlvo(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-base sm:text-sm font-black text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Prazo (Opcional)
                    </label>
                    <input
                      type="date"
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] scheme-dark"
                    />
                  </div>
                </div>

                {/* Ícone Selection Grid */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Escolha um Ícone
                  </label>
                  <div className="grid grid-cols-8 gap-2 p-2 rounded-2xl bg-black/40 border border-white/5">
                    {Object.keys(GOAL_ICONS).map((iconKey) => {
                      const IconItem = GOAL_ICONS[iconKey];
                      const isSelected = selectedIcon === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setSelectedIcon(iconKey)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#7C3AED] text-white shadow-[0_0_12px_rgba(124,58,237,0.5)] scale-110'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <IconItem className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cor da Meta (Paleta de 8 cores MCO) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Cor da Meta
                  </label>
                  <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-black/40 border border-white/5">
                    {GOAL_COLORS.map((hex) => {
                      const isSelected = selectedColor === hex;
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setSelectedColor(hex)}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer relative"
                          style={{ backgroundColor: hex }}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="mt-2 p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Prévia do Card:
                  </span>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{
                        backgroundColor: `${selectedColor}20`,
                        borderColor: `${selectedColor}40`,
                        color: selectedColor
                      }}
                    >
                      {React.createElement(GOAL_ICONS[selectedIcon] || Target, { className: 'w-5 h-5' })}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">
                        {nome || 'Nome da sua meta'}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Alvo: {valorAlvo ? formatBRL(parseFloat(valorAlvo) || 0) : 'R$ 0,00'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] text-white text-xs font-black shadow-[0_4px_16px_rgba(124,58,237,0.4)] cursor-pointer"
                  >
                    {editingMeta ? 'Salvar Alterações' : 'Criar Meta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADICIONAR RESERVA MODAL */}
      <AnimatePresence>
        {reservaTargetMeta && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md bg-[#161224] border-t sm:border border-primary/30 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `${reservaTargetMeta.cor || '#7C3AED'}20`,
                      borderColor: `${reservaTargetMeta.cor || '#7C3AED'}40`,
                      color: reservaTargetMeta.cor || '#7C3AED'
                    }}
                  >
                    {React.createElement(GOAL_ICONS[reservaTargetMeta.icone || 'target'] || Target, { className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Adicionar Reserva</h3>
                    <p className="text-[11px] text-zinc-400">{reservaTargetMeta.nome}</p>
                  </div>
                </div>

                <button
                  onClick={() => setReservaTargetMeta(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveReserva} className="p-6 flex flex-col gap-4">
                {reservaError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300">
                    {reservaError}
                  </div>
                )}

                {/* Valor a Reservar */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Valor a Reservar (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-zinc-400 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={reservaValor}
                      onChange={(e) => setReservaValor(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-base sm:text-sm font-black text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Data e Descrição */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Data do Aporte
                    </label>
                    <input
                      type="date"
                      value={reservaData}
                      onChange={(e) => setReservaData(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] scheme-dark"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Descrição (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Sobrou do mês"
                      value={reservaDescricao}
                      onChange={(e) => setReservaDescricao(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs font-bold text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                    />
                  </div>
                </div>

                {/* Dynamic Preview of Meta Progress */}
                {(() => {
                  const inputVal = parseFloat(reservaValor.replace(',', '.')) || 0;
                  const newTotal = (reservaTargetMeta.valor_atual || 0) + inputVal;
                  const newPct = reservaTargetMeta.valor_alvo > 0 ? (newTotal / reservaTargetMeta.valor_alvo) * 100 : 0;
                  const color = reservaTargetMeta.cor || '#7C3AED';

                  return (
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-zinc-400">Progresso após este aporte:</span>
                        <span style={{ color }}>{newPct.toFixed(0)}% atingido</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(newPct, 100)}%`,
                            backgroundColor: color
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Atual: {formatBRL(reservaTargetMeta.valor_atual)}</span>
                        <span className="text-white font-bold">Novo: {formatBRL(newTotal)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setReservaTargetMeta(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-white font-black text-xs shadow-lg cursor-pointer"
                    style={{ backgroundColor: reservaTargetMeta.cor || '#7C3AED' }}
                  >
                    Confirmar Reserva
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HISTÓRICO DE RESERVAS MODAL */}
      <AnimatePresence>
        {historyTargetMeta && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-lg bg-[#161224] border-t sm:border border-primary/30 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#c4b5fd]">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Histórico de Aportes</h3>
                    <p className="text-[11px] text-zinc-400">{historyTargetMeta.nome}</p>
                  </div>
                </div>

                <button
                  onClick={() => setHistoryTargetMeta(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5 text-xs">
                  <span className="text-zinc-400 font-bold">Total Acumulado:</span>
                  <span className="text-base font-black text-emerald-400">
                    {formatBRL(historyTargetMeta.valor_atual)}
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reservasHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Nenhum aporte registrado individualmente nesta meta ainda.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {reservasHistory.map((res) => {
                      const resDate = new Date(res.data + 'T12:00:00');
                      return (
                        <div
                          key={res.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">
                              {res.descricao || 'Aporte na meta'}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {resDate.toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-emerald-400">
                              +{formatBRL(res.valor)}
                            </span>
                            <button
                              onClick={() => handleDeleteReserva(res.id)}
                              className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                              title="Remover aporte"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CELEBRAÇÃO MODAL 🎉 */}
      <AnimatePresence>
        {celebrationMeta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="w-full max-w-sm bg-gradient-to-b from-[#1f1638] to-[#120d22] border border-[#7C3AED]/50 rounded-[32px] p-7 flex flex-col items-center text-center gap-5 shadow-[0_0_50px_rgba(124,58,237,0.5)] relative overflow-hidden"
            >
              {/* Confetti Icon Glow */}
              <div className="w-20 h-20 rounded-3xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-bounce">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black text-[#c4b5fd] uppercase tracking-widest bg-[#7C3AED]/20 px-3 py-1 rounded-full border border-[#7C3AED]/30">
                  🎉 Meta Atingida!
                </span>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Parabéns, {profile.name}!
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Você juntou com sucesso <strong>{formatBRL(celebrationMeta.valor_atual)}</strong> para a sua meta <strong>"{celebrationMeta.nome}"</strong>.
                </p>
              </div>

              <button
                onClick={() => setCelebrationMeta(null)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] text-white font-black text-xs shadow-[0_4px_20px_rgba(124,58,237,0.5)] hover:scale-105 transition-transform cursor-pointer border border-[#c4b5fd]/40"
              >
                Concluir & Festejar 🎉
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
