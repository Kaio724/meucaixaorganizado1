import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ContaFinanceira,
  ContaTipo,
  ContaFrequencia,
  AccountType,
  Transaction,
  UserProfile
} from '../types';
import {
  fetchContas,
  saveConta,
  deleteConta,
  toggleContaAtiva,
  marcarContaLancadaMes,
  isContaLancadaNoMes
} from '../lib/contasData';
import { getCategoryNamesByType } from '../lib/categories';
import { getPersonalCategoryNamesByType } from '../lib/personalCategories';

interface ContasFixasVariaveisProps {
  profile: UserProfile;
  userId: string;
  accountType: AccountType; // 'empresarial' | 'pessoal' - CRITICAL ISOLATION RULE
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void> | void;
  onNavigateToTab?: (tab: any) => void;
}

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ContasFixasVariaveis({
  profile,
  userId,
  accountType,
  transactions,
  onAddTransaction,
  onNavigateToTab
}: ContasFixasVariaveisProps) {
  const isBusiness = accountType === 'empresarial';
  const now = new Date();

  // Period state
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Main active tab
  const [activeTab, setActiveTab] = useState<'fixas' | 'variaveis'>('fixas');

  // Sub-filter for fixed accounts
  const [fixedStatusFilter, setFixedStatusFilter] = useState<'todas' | 'ativas' | 'pausadas'>('todas');

  // Accounts state
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);

  // Modal Form Fields
  const [formNome, setFormNome] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formTipo, setFormTipo] = useState<ContaTipo>('fixa');
  const [formCategoria, setFormCategoria] = useState('');
  const [formFrequencia, setFormFrequencia] = useState<ContaFrequencia>('mensal');
  const [formFrequenciaPersonalizada, setFormFrequenciaPersonalizada] = useState('');
  const [formDiaVencimento, setFormDiaVencimento] = useState<string>('10');
  const [formDataVencimento, setFormDataVencimento] = useState<string>('');
  const [formObservacao, setFormObservacao] = useState('');
  const [formAtiva, setFormAtiva] = useState(true);

  // New Category inline creation state
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Delete confirmation
  const [deletingContaId, setDeletingContaId] = useState<string | null>(null);

  // Loading indicator for launching transaction
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load contas strictly for current accountType
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchContas(userId, accountType);
      setContas(data);
    } catch (e) {
      console.warn('Error loading contas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, accountType]);

  // Current selected month string in YYYY-MM format
  const currentMonthKey = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  // Filter transactions for this environment and selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txAccount = t.accountType || 'empresarial';
      if (txAccount !== accountType) return false;
      const tDate = new Date(t.date + 'T12:00:00');
      return tDate.getMonth() === selectedMonthIndex && tDate.getFullYear() === selectedYear;
    });
  }, [transactions, accountType, selectedMonthIndex, selectedYear]);

  // All environment transactions (for historical comparison of variable expenses)
  const envTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txAccount = t.accountType || 'empresarial';
      return txAccount === accountType;
    });
  }, [transactions, accountType]);

  // Entradas of the selected month
  const totalEntradasMes = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  // Saídas of the selected month
  const totalSaidasMes = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  // Categorize actual transactions launched in this month as Fixas vs Variáveis
  const lancamentosFixosMes = useMemo(() => {
    return monthTransactions.filter((t) => t.type === 'saida' && t.expenseType === 'fixa');
  }, [monthTransactions]);

  const lancamentosVariaveisMes = useMemo(() => {
    return monthTransactions.filter((t) => t.type === 'saida' && t.expenseType !== 'fixa');
  }, [monthTransactions]);

  const totalGastoFixasLancadas = lancamentosFixosMes.reduce((sum, t) => sum + t.amount, 0);
  const totalGastoVariaveisLancadas = lancamentosVariaveisMes.reduce((sum, t) => sum + t.amount, 0);

  // Registered Fixed Accounts calculations
  const contasFixas = useMemo(() => {
    return contas.filter((c) => c.tipo === 'fixa');
  }, [contas]);

  const contasVariaveis = useMemo(() => {
    return contas.filter((c) => c.tipo === 'variavel');
  }, [contas]);

  // Estimated total of active registered fixed accounts for a month
  const totalEstimadoFixas = useMemo(() => {
    return contasFixas
      .filter((c) => c.ativa)
      .reduce((sum, c) => {
        if (c.frequencia === 'semanal') return sum + c.valor * 4;
        if (c.frequencia === 'quinzenal') return sum + c.valor * 2;
        if (c.frequencia === 'anual') return sum + c.valor / 12;
        return sum + c.valor; // mensal & personalizada
      }, 0);
  }, [contasFixas]);

  // Effective Total de Despesas Fixas:
  // If user has launched fixed expenses, show launched or estimated, whichever is greater/relevant
  const totalFixasExibicao = totalGastoFixasLancadas > 0 ? totalGastoFixasLancadas : totalEstimadoFixas;

  // Effective Total de Despesas Variáveis: actual spent in the period (or registered reference)
  const totalVariaveisExibicao = totalGastoVariaveisLancadas > 0
    ? totalGastoVariaveisLancadas
    : contasVariaveis.reduce((sum, c) => sum + c.valor, 0);

  const totalDespesasGeral = totalFixasExibicao + totalVariaveisExibicao;

  // Saldo restante: Entradas do mês - total de despesas
  const saldoRestante = totalEntradasMes - (totalSaidasMes > 0 ? totalSaidasMes : totalDespesasGeral);

  // Percentage calculations
  const pctFixas = totalDespesasGeral > 0 ? Math.round((totalFixasExibicao / totalDespesasGeral) * 100) : 50;
  const pctVariaveis = 100 - pctFixas;

  // Available categories for dropdown
  const availableCategories = useMemo(() => {
    if (isBusiness) {
      return getCategoryNamesByType(userId, 'saida');
    }
    return getPersonalCategoryNamesByType(userId, 'saida');
  }, [isBusiness, userId]);

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  // Open modal for new account
  const handleOpenNewAccountModal = (prefillTipo?: ContaTipo) => {
    setEditingConta(null);
    setFormNome('');
    setFormValor('');
    setFormTipo(prefillTipo || activeTab === 'fixas' ? 'fixa' : 'variavel');
    setFormCategoria(availableCategories[0] || 'Outros');
    setFormFrequencia('mensal');
    setFormFrequenciaPersonalizada('');
    setFormDiaVencimento('10');
    setFormDataVencimento('');
    setFormObservacao('');
    setFormAtiva(true);
    setShowNewCatInput(false);
    setNewCatName('');
    setIsModalOpen(true);
  };

  // Open modal for editing existing account
  const handleOpenEditModal = (conta: ContaFinanceira) => {
    setEditingConta(conta);
    setFormNome(conta.nome);
    setFormValor(String(conta.valor).replace('.', ','));
    setFormTipo(conta.tipo);
    setFormCategoria(conta.categoria);
    setFormFrequencia(conta.frequencia);
    setFormFrequenciaPersonalizada(conta.frequenciaPersonalizada || '');
    setFormDiaVencimento(conta.diaVencimento ? String(conta.diaVencimento) : '10');
    setFormDataVencimento(conta.dataVencimento || '');
    setFormObservacao(conta.observacao || '');
    setFormAtiva(conta.ativa);
    setShowNewCatInput(false);
    setNewCatName('');
    setIsModalOpen(true);
  };

  // Save Account (Create or Update)
  const handleSaveContaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    const parsedVal = parseFloat(formValor.replace(',', '.'));
    if (isNaN(parsedVal) || parsedVal <= 0) return;

    const chosenCategoria = showNewCatInput && newCatName.trim()
      ? newCatName.trim()
      : formCategoria || 'Outros';

    const diaNum = formDiaVencimento ? parseInt(formDiaVencimento, 10) : undefined;

    const contaToSave: Omit<ContaFinanceira, 'id'> & { id?: string } = {
      ...(editingConta ? { id: editingConta.id } : {}),
      nome: formNome.trim(),
      valor: parsedVal,
      tipo: formTipo,
      categoria: chosenCategoria,
      frequencia: formTipo === 'fixa' ? formFrequencia : 'avulsa',
      frequenciaPersonalizada: formFrequencia === 'personalizada' ? formFrequenciaPersonalizada : undefined,
      diaVencimento: !isNaN(diaNum as number) ? diaNum : undefined,
      dataVencimento: formDataVencimento || undefined,
      observacao: formObservacao.trim() || undefined,
      ativa: formAtiva,
      accountType
    };

    try {
      const saved = await saveConta(userId, contaToSave);
      setContas((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        if (exists) {
          return prev.map((c) => (c.id === saved.id ? saved : c));
        }
        return [saved, ...prev];
      });

      setIsModalOpen(false);
      showToast(editingConta ? 'Conta atualizada com sucesso!' : 'Conta adicionada com sucesso!');
    } catch (err) {
      console.warn('Error saving conta:', err);
      showToast('Erro ao salvar conta. Tente novamente.');
    }
  };

  // Toggle Active / Paused
  const handleToggleActive = async (conta: ContaFinanceira) => {
    try {
      const updated = await toggleContaAtiva(userId, conta.id, accountType);
      if (updated) {
        setContas((prev) => prev.map((c) => (c.id === conta.id ? { ...c, ativa: !c.ativa } : c)));
        showToast(updated.ativa ? `Conta "${conta.nome}" ativada!` : `Conta "${conta.nome}" pausada!`);
      }
    } catch (err) {
      console.warn('Error toggling conta:', err);
    }
  };

  // Delete Account
  const handleDeleteConta = async (id: string) => {
    try {
      const success = await deleteConta(userId, id, accountType);
      if (success) {
        setContas((prev) => prev.filter((c) => c.id !== id));
        setDeletingContaId(null);
        showToast('Conta excluída com sucesso.');
      }
    } catch (err) {
      console.warn('Error deleting conta:', err);
    }
  };

  // 1-Click Launch into Month's Cash Flow (Lançar no caixa deste mês)
  const handleLancarNoCaixa = async (conta: ContaFinanceira) => {
    setLaunchingId(conta.id);
    try {
      const day = conta.diaVencimento ? String(conta.diaVencimento).padStart(2, '0') : '10';
      const maxDayInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
      const validDay = Math.min(parseInt(day, 10), maxDayInMonth);
      const formattedDay = String(validDay).padStart(2, '0');
      const dateStr = `${currentMonthKey}-${formattedDay}`;

      await onAddTransaction({
        title: conta.nome,
        amount: conta.valor,
        type: 'saida',
        date: dateStr,
        category: conta.categoria,
        paymentMethod: 'Boleto',
        accountType,
        expenseType: conta.tipo,
        contaId: conta.id,
        description: conta.observacao || `Conta ${conta.tipo === 'fixa' ? 'Fixa' : 'Variável'} programada`
      });

      await marcarContaLancadaMes(userId, conta.id, accountType, currentMonthKey);
      setContas((prev) =>
        prev.map((c) => (c.id === conta.id ? { ...c, ultimoLancamentoMes: currentMonthKey } : c))
      );

      showToast(`Lançamento de ${formatBRL(conta.valor)} inserido no caixa de ${MONTHS_NAMES[selectedMonthIndex]}!`);
    } catch (err) {
      console.warn('Error launching conta to transactions:', err);
      showToast('Erro ao lançar conta no caixa.');
    } finally {
      setLaunchingId(null);
    }
  };

  // Filtered fixed accounts list
  const filteredContasFixas = useMemo(() => {
    if (fixedStatusFilter === 'ativas') return contasFixas.filter((c) => c.ativa);
    if (fixedStatusFilter === 'pausadas') return contasFixas.filter((c) => !c.ativa);
    return contasFixas;
  }, [contasFixas, fixedStatusFilter]);

  // Compute 3-month comparison for Variable Expenses (Requirement 7)
  const variableMonthlyBreakdown = useMemo(() => {
    const months = [];
    for (let i = 2; i >= 0; i--) {
      let targetMonth = selectedMonthIndex - i;
      let targetYear = selectedYear;
      if (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      const mKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
      const mLabel = `${MONTHS_NAMES[targetMonth].substring(0, 3)}/${targetYear}`;
      const sum = envTransactions
        .filter((t) => t.type === 'saida' && t.expenseType !== 'fixa' && t.date.startsWith(mKey))
        .reduce((acc, t) => acc + t.amount, 0);

      months.push({ key: mKey, label: mLabel, total: sum });
    }
    return months;
  }, [envTransactions, selectedMonthIndex, selectedYear]);

  return (
    <div className="w-full flex flex-col gap-6 text-left pb-16 animate-fade-in">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-black/90 border border-primary/40 text-white text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-primary text-base">check_circle</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-[28px] bg-gradient-to-r from-[#171328] via-[#141022] to-[#100d1c] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                isBusiness
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'bg-violet-500/15 border-violet-500/30 text-[#c4b5fd]'
              }`}
            >
              <span className="material-symbols-outlined text-xs">
                {isBusiness ? 'domain' : 'person'}
              </span>
              <span>{isBusiness ? 'Ambiente Negócio (Empresarial)' : 'Ambiente Pessoal'}</span>
            </span>

            <span className="text-[10px] font-bold text-zinc-400">
              Dados 100% segregados
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              receipt_long
            </span>
            Contas Fixas e Variáveis
          </h1>
          <p className="text-xs text-zinc-400 font-medium max-w-xl">
            Entenda quanto você precisa pagar todos os meses e onde seu dinheiro está variando.
          </p>
        </div>

        {/* Action Button & Period Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10 flex-wrap sm:flex-nowrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="px-2 text-[11px] font-bold text-white uppercase tracking-wide min-w-[100px] text-center">
              {MONTHS_NAMES[selectedMonthIndex]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          {/* Add Account Button */}
          <button
            onClick={() => handleOpenNewAccountModal()}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-[#8b5cf6] hover:from-[#8b6eff] hover:to-[#9333ea] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ Adicionar conta</span>
          </button>
        </div>
      </div>

      {/* ================= RESUMO CARDS (4 CARDS) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. CONTAS FIXAS */}
        <div className="p-5 rounded-2xl bg-[#141022]/90 border border-primary/25 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                Contas Fixas
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {pctFixas}% das despesas
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatBRL(totalFixasExibicao)}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
              Estimado recorrente: {formatBRL(totalEstimadoFixas)}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
            <span>{contasFixas.filter((c) => c.ativa).length} ativas cadastradas</span>
            <span className="text-primary font-bold">Previsibilidade</span>
          </div>
        </div>

        {/* 2. CONTAS VARIÁVEIS */}
        <div className="p-5 rounded-2xl bg-[#141022]/90 border border-amber-500/25 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Contas Variáveis
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {pctVariaveis}% das despesas
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-amber-300 tracking-tight">
              {formatBRL(totalVariaveisExibicao)}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
              Gasto lançado no período
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
            <span>{lancamentosVariaveisMes.length} lançamentos no mês</span>
            <span className="text-amber-400 font-bold">Oscila por uso</span>
          </div>
        </div>

        {/* 3. TOTAL DE DESPESAS */}
        <div className="p-5 rounded-2xl bg-[#141022]/90 border border-rose-500/25 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                Total de Despesas
              </span>
            </div>
            <span className="text-[10px] font-bold text-zinc-400">
              Fixas + Variáveis
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatBRL(totalDespesasGeral)}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
              Total consolidado do mês
            </div>
          </div>

          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5 flex">
            <div
              className="bg-primary h-full transition-all duration-500"
              style={{ width: `${pctFixas}%` }}
              title={`Fixas: ${pctFixas}%`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${pctVariaveis}%` }}
              title={`Variáveis: ${pctVariaveis}%`}
            />
          </div>
        </div>

        {/* 4. VISÃO MENSAL & ESTRUTURA */}
        <div className="p-5 rounded-2xl bg-[#141022]/90 border border-emerald-500/25 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">savings</span>
              Visão Mensal & Estrutura
            </span>
            <span className="text-[10px] font-bold text-zinc-400">
              {isBusiness ? 'Ponto de Equilíbrio' : 'Custo de Vida'}
            </span>
          </div>

          <div className="my-3">
            <div className="text-[11px] text-zinc-300 font-medium">
              Necessário para manter a estrutura:
            </div>
            <div className="text-lg font-black text-white mt-0.5">
              {formatBRL(totalEstimadoFixas)} / mês
            </div>

            {totalEntradasMes > 0 && (
              <div className="mt-1 text-[11px] font-bold flex items-center gap-1 text-emerald-400">
                <span>Saldo restante:</span>
                <span>{formatBRL(saldoRestante)}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5 text-[10px] text-zinc-400 truncate">
            {isBusiness
              ? `Seu negócio possui ${formatBRL(totalEstimadoFixas)} em despesas fixas recorrentes.`
              : `Suas despesas fixas pessoais somam ${formatBRL(totalEstimadoFixas)} por mês.`}
          </div>
        </div>
      </div>

      {/* ================= TABS NAVIGATION [ CONTAS FIXAS ] [ CONTAS VARIÁVEIS ] ================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl border border-white/10 self-start">
          <button
            onClick={() => setActiveTab('fixas')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'fixas'
                ? 'bg-primary text-white shadow-lg shadow-primary/30 border border-primary/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">lock</span>
            <span>Contas Fixas ({contasFixas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('variaveis')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'variaveis'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            <span>Contas Variáveis ({contasVariaveis.length})</span>
          </button>
        </div>

        {/* Secondary filters when on fixed accounts */}
        {activeTab === 'fixas' && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-zinc-500 font-semibold mr-1">Status:</span>
            {(['todas', 'ativas', 'pausadas'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFixedStatusFilter(st)}
                className={`px-3 py-1 rounded-xl font-bold capitalize transition-all cursor-pointer ${
                  fixedStatusFilter === st
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================= TAB CONTENT 1: CONTAS FIXAS ================= */}
      {activeTab === 'fixas' && (
        <div className="flex flex-col gap-4">
          {/* Informational Callout */}
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-xl">auto_mode</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  Contas Fixas & Recorrência Segura
                </h4>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Estas despesas servem como referência de custo fixo mensal. Você pode lançar no caixa do mês corrente com 1 clique sem duplicidade.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewAccountModal('fixa')}
              className="px-3 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Cadastrar Fixa</span>
            </button>
          </div>

          {/* Accounts Grid / List */}
          {filteredContasFixas.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#141022]/60 border border-white/5 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-zinc-600 text-5xl">lock_open</span>
              <p className="text-sm font-bold text-white">Nenhuma conta fixa encontrada</p>
              <p className="text-xs text-zinc-400 max-w-sm">
                Cadastre contas como Aluguel, Internet, Softwares ou Contabilidade para acompanhar seu custo fixo mensal.
              </p>
              <button
                onClick={() => handleOpenNewAccountModal('fixa')}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
              >
                + Adicionar Conta Fixa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContasFixas.map((conta) => {
                const jaLancada = isContaLancadaNoMes(conta, currentMonthKey, transactions);

                return (
                  <div
                    key={conta.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative ${
                      conta.ativa
                        ? 'bg-[#141022]/90 border-white/10 hover:border-primary/40 shadow-sm'
                        : 'bg-[#0f0c18]/60 border-white/5 opacity-70'
                    }`}
                  >
                    {/* Header: Name, Active Badge & Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                            {conta.nome}
                          </h3>
                          {!conta.ativa && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Pausada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                            {conta.categoria}
                          </span>
                          <span className="text-[10px] font-semibold text-primary">
                            • {conta.frequencia === 'personalizada'
                              ? conta.frequenciaPersonalizada || 'Personalizada'
                              : conta.frequencia.charAt(0).toUpperCase() + conta.frequencia.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleActive(conta)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border transition-colors cursor-pointer shrink-0 ${
                          conta.ativa
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                        title={conta.ativa ? 'Clique para pausar' : 'Clique para ativar'}
                      >
                        {conta.ativa ? 'Ativa' : 'Pausada'}
                      </button>
                    </div>

                    {/* Middle: Amount & Due Day */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          Valor Estimado
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {formatBRL(conta.valor)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          Vencimento
                        </span>
                        <span className="text-xs font-bold text-zinc-300">
                          {conta.diaVencimento ? `Todo dia ${conta.diaVencimento}` : 'A definir'}
                        </span>
                      </div>
                    </div>

                    {/* Observação if any */}
                    {conta.observacao && (
                      <p className="text-[11px] text-zinc-400 italic bg-black/20 p-2 rounded-xl border border-white/5">
                        "{conta.observacao}"
                      </p>
                    )}

                    {/* Bottom Status & 1-Click Launch */}
                    <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        {jaLancada ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>Lançada em {MONTHS_NAMES[selectedMonthIndex].substring(0, 3)}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleLancarNoCaixa(conta)}
                            disabled={launchingId === conta.id}
                            className="flex items-center gap-1.5 text-[11px] font-extrabold text-white bg-primary hover:bg-[#8b6eff] px-3 py-1.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">payments</span>
                            <span>{launchingId === conta.id ? 'Lançando...' : 'Lançar no Caixa deste Mês'}</span>
                          </button>
                        )}

                        {/* Edit and Delete Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(conta)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Editar conta"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingContaId(conta.id)}
                            className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Excluir conta"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB CONTENT 2: CONTAS VARIÁVEIS ================= */}
      {activeTab === 'variaveis' && (
        <div className="flex flex-col gap-6">
          {/* Informational Callout */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                <span className="material-symbols-outlined text-xl">trending_up</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  Contas Variáveis & Oscilação Mensal
                </h4>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Despesas como fornecedores, materiais, mercado ou combustível variam a cada mês. O sistema mantém lançamentos individuais e calcula as tendências.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewAccountModal('variavel')}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Cadastrar Variável</span>
            </button>
          </div>

          {/* Historical 3-Month Trend Cards (Requirement 7) */}
          <div className="p-5 rounded-2xl bg-[#141022]/90 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">bar_chart</span>
                Evolução das Despesas Variáveis
              </h3>
              <span className="text-[10px] text-zinc-500">Histórico Recente</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {variableMonthlyBreakdown.map((m) => (
                <div key={m.key} className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{m.label}</span>
                  <span className="text-base sm:text-lg font-black text-amber-300 mt-1">
                    {formatBRL(m.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Contas Variáveis Cadastradas como Referência */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-base">format_list_bulleted</span>
              Contas e Categorias Variáveis Cadastradas
            </h3>

            {contasVariaveis.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#141022]/60 border border-white/5 text-center text-xs text-zinc-400">
                Nenhuma conta variável cadastrada como referência. Clique em "+ Adicionar conta" acima.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {contasVariaveis.map((conta) => (
                  <div
                    key={conta.id}
                    className="p-4 rounded-xl bg-[#141022]/90 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{conta.nome}</h4>
                        <span className="text-[10px] text-zinc-400 font-semibold">{conta.categoria}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(conta)}
                          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingContaId(conta.id)}
                          className="w-7 h-7 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center cursor-pointer"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-xs">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs text-zinc-400">Valor de referência:</span>
                      <span className="text-sm font-black text-amber-300">{formatBRL(conta.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Lançamentos Variáveis Registrados no Mês Selecionado */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-base">receipt</span>
              Lançamentos Variáveis Registrados em {MONTHS_NAMES[selectedMonthIndex]}
            </h3>

            {lancamentosVariaveisMes.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#141022]/60 border border-white/5 text-center text-xs text-zinc-400">
                Nenhum lançamento variável realizado neste mês.
              </div>
            ) : (
              <div className="bg-[#141022]/90 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                {lancamentosVariaveisMes.map((tx) => (
                  <div key={tx.id} className="p-3.5 px-4 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-base">arrow_upward</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{tx.title}</h5>
                        <p className="text-[10px] text-zinc-400">
                          {tx.date.split('-').reverse().join('/')} • Variável • {tx.category} • {tx.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs sm:text-sm font-black text-rose-400">
                      - {formatBRL(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADICIONAR / EDITAR CONTA ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
            <div className="absolute inset-0 cursor-default" onClick={() => setIsModalOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="glass-card rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 border-t sm:border border-white/10 w-full max-w-lg flex flex-col gap-4 relative bg-[#131020]/98 shadow-2xl max-h-[92vh] overflow-y-auto z-10 text-left"
            >
              {/* Drag Handle Mobile */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />

              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">
                      {editingConta ? 'edit_note' : 'add_circle'}
                    </span>
                    {editingConta ? 'Editar Conta' : 'Adicionar Conta'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {isBusiness ? 'Ambiente Negócio (Empresarial)' : 'Ambiente Pessoal'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveContaSubmit} className="flex flex-col gap-4">
                {/* 1. Nome da Conta */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Nome da Conta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formTipo === 'fixa'
                        ? isBusiness
                          ? 'Ex: Internet Fibra, Aluguel, Sistema ERP...'
                          : 'Ex: Aluguel, Plano de Saúde, Academia...'
                        : isBusiness
                        ? 'Ex: Fornecedor de Insumos, Combustível...'
                        : 'Ex: Supermercado, Farmácia, Lazer...'
                    }
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="w-full bg-[#181426] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 2. Valor & Tipo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Valor */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Valor (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        R$
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="0,00"
                        value={formValor}
                        onChange={(e) => setFormValor(e.target.value)}
                        className="w-full bg-[#181426] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Tipo Switcher (Fixa vs Variável) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Tipo de Conta *
                    </label>
                    <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10 gap-1 h-[42px]">
                      <button
                        type="button"
                        onClick={() => setFormTipo('fixa')}
                        className={`h-full rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          formTipo === 'fixa'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">lock</span>
                        <span>Fixa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormTipo('variavel')}
                        className={`h-full rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          formTipo === 'variavel'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">tune</span>
                        <span>Variável</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Categoria & Criar Nova Categoria */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Categoria *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(!showNewCatInput)}
                      className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                    >
                      {showNewCatInput ? 'Usar categoria existente' : '+ Criar nova categoria'}
                    </button>
                  </div>

                  {showNewCatInput ? (
                    <input
                      type="text"
                      placeholder="Digite o nome da nova categoria..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-[#181426] border border-primary/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      className="w-full bg-[#181426] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#141022] text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 4. Frequência (Para fixas) e Vencimento */}
                {formTipo === 'fixa' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Frequência */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                        Frequência
                      </label>
                      <select
                        value={formFrequencia}
                        onChange={(e) => setFormFrequencia(e.target.value as ContaFrequencia)}
                        className="bg-[#181426] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="mensal" className="bg-[#141022] text-white">Mensal</option>
                        <option value="semanal" className="bg-[#141022] text-white">Semanal</option>
                        <option value="quinzenal" className="bg-[#141022] text-white">Quinzenal</option>
                        <option value="anual" className="bg-[#141022] text-white">Anual</option>
                        <option value="personalizada" className="bg-[#141022] text-white">Personalizada</option>
                      </select>
                    </div>

                    {/* Dia de Vencimento */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                        Dia do Vencimento (1 a 31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Ex: 10"
                        value={formDiaVencimento}
                        onChange={(e) => setFormDiaVencimento(e.target.value)}
                        className="bg-[#181426] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                      />
                    </div>

                    {formFrequencia === 'personalizada' && (
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-zinc-300 uppercase">
                          Descrição da Frequência Personalizada
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: A cada 3 meses, por safra, trimestral..."
                          value={formFrequenciaPersonalizada}
                          onChange={(e) => setFormFrequenciaPersonalizada(e.target.value)}
                          className="bg-[#181426] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Data de Vencimento ou Previsão (Opcional)
                    </label>
                    <input
                      type="date"
                      value={formDataVencimento}
                      onChange={(e) => setFormDataVencimento(e.target.value)}
                      className="bg-[#181426] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                {/* 5. Observação */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Observação (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Adicione anotações, detalhes contratuais ou instruções de pagamento..."
                    value={formObservacao}
                    onChange={(e) => setFormObservacao(e.target.value)}
                    className="w-full bg-[#181426] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                {/* 6. Ativa? Switcher */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Conta Ativa?</span>
                    <span className="text-[10px] text-zinc-400">
                      Contas ativas entram no cálculo do custo estimado mensal.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormAtiva(!formAtiva)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      formAtiva
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {formAtiva ? 'Sim (Ativa)' : 'Não (Pausada)'}
                  </button>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-white text-xs font-black shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">check</span>
                    <span>{editingConta ? 'Salvar Alterações' : 'Cadastrar Conta'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: EXCLUIR CONTA ================= */}
      <AnimatePresence>
        {deletingContaId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 rounded-[28px] bg-[#141022] border border-rose-500/30 max-w-sm w-full flex flex-col items-center text-center gap-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">delete_forever</span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white">Excluir Conta?</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Tem certeza que deseja remover esta conta? Os lançamentos já realizados no caixa não serão apagados.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full pt-2">
                <button
                  onClick={() => setDeletingContaId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteConta(deletingContaId)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg cursor-pointer"
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
