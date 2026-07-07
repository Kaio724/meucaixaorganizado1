import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';

interface ProGrowthPanelProps {
  transactions: Transaction[];
  isPro: boolean;
  onUnlockPro: () => void;
}

// Hook to animate numbers from 0 to target
function AnimatedCount({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setCurrent(0);
      return;
    }
    const start = 0;
    const end = value;
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
  }, [value, duration]);

  return <span>{Math.round(current)}</span>;
}

export default function ProGrowthPanel({ transactions, isPro, onUnlockPro }: ProGrowthPanelProps) {
  const [activeTab, setActiveTab] = useState<'goal' | 'health'>('goal');
  
  // Goal Settings State
  const [goal, setGoal] = useState<number | null>(() => {
    const saved = localStorage.getItem('mco_revenue_goal');
    return saved ? parseFloat(saved) : null;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Currency Formatter
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Get current month transactions
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  // Calculate stats
  const totalFaturado = currentMonthTxs
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDespesas = currentMonthTxs
    .filter(t => t.type === 'saida' && t.category !== 'Pro-Labore')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRetiradas = currentMonthTxs
    .filter(t => t.type === 'saida' && (t.category === 'Pro-Labore' || t.title.toLowerCase().includes('retirada') || t.title.toLowerCase().includes('pró-labore') || t.title.toLowerCase().includes('pessoal') || t.description?.toLowerCase().includes('retirada')))
    .reduce((sum, t) => sum + t.amount, 0);

  // Goal values (mocked to R$ 10.000,00 for Essential preview)
  const goalValue = isPro ? (goal || 0) : 10000;
  const faturadoDisplay = isPro ? totalFaturado : (totalFaturado > 0 ? totalFaturado : 7830);
  const goalPercentage = goalValue > 0 ? Math.round((faturadoDisplay / goalValue) * 100) : 0;
  const goalMissing = Math.max(0, goalValue - faturadoDisplay);

  // Financial Health values (mocked if Essential)
  const healthReceitas = isPro ? totalFaturado : (totalFaturado > 0 ? totalFaturado : 12450);
  const healthDespesas = isPro ? totalDespesas : (totalDespesas > 0 ? totalDespesas : 3120);
  const healthRetiradas = isPro ? totalRetiradas : (totalRetiradas > 0 ? totalRetiradas : 1500);
  const healthMargemPercent = healthReceitas > 0 ? Math.round(((healthReceitas - healthDespesas - healthRetiradas) / healthReceitas) * 100) : 74;

  const hasHealthData = healthReceitas > 0 || healthDespesas > 0 || healthRetiradas > 0;

  // Goal Modal Handlers
  const handleOpenGoalModal = () => {
    setInputValue(goal ? goal.toString() : '');
    setIsModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0) {
      setGoal(parsed);
      localStorage.setItem('mco_revenue_goal', parsed.toString());
      setIsModalOpen(false);
    }
  };

  // Status message logic for Goal
  let goalStatusMessage = '';
  if (goalPercentage === 0) {
    goalStatusMessage = 'Inicie seus lançamentos de entrada para começar a pontuar sua meta!';
  } else if (goalPercentage < 35) {
    goalStatusMessage = 'Ótimo começo! Continue focado e registre todas as suas vendas.';
  } else if (goalPercentage < 70) {
    goalStatusMessage = 'Excelente ritmo! Você está no caminho certo do seu objetivo.';
  } else if (goalPercentage < 100) {
    goalStatusMessage = 'Quase lá! Falta muito pouco para você consolidar esta meta.';
  } else if (goalPercentage === 100) {
    goalStatusMessage = 'Parabéns! Você atingiu 100% da sua meta de faturamento!';
  } else {
    const surplus = faturadoDisplay - goalValue;
    goalStatusMessage = `Espetacular! Você superou sua meta de faturamento em ${formatBRL(surplus)}.`;
  }

  // Score & Status Logic for Financial Health
  let healthScore = 0;
  let healthStatusLabel = 'Atenção';
  let healthColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  let healthBulletColor = 'bg-amber-400';
  let healthStatusMessage = 'Adicione transações para ver o diagnóstico.';
  let hasWithdrawalPenalty = false;

  if (hasHealthData) {
    if (healthReceitas === 0) {
      healthScore = 10;
    } else {
      const expenseRatio = healthDespesas / healthReceitas;
      let baseScore = 50;

      if (expenseRatio < 0.50) {
        baseScore = 100 - Math.round(expenseRatio * 30); // 85 to 100
      } else if (expenseRatio < 0.70) {
        baseScore = 84 - Math.round(((expenseRatio - 0.50) / 0.20) * 14); // 70 to 84
      } else if (expenseRatio < 0.90) {
        baseScore = 69 - Math.round(((expenseRatio - 0.70) / 0.20) * 19); // 50 to 69
      } else {
        baseScore = Math.max(5, 49 - Math.round(((expenseRatio - 0.90) / 0.50) * 44)); // 5 to 49
      }

      // Withdrawals penalty
      const lucro = healthReceitas - healthDespesas;
      if (lucro > 0 && healthRetiradas > 0) {
        const withdrawalRatio = healthRetiradas / lucro;
        if (withdrawalRatio > 0.60) {
          baseScore = Math.max(5, baseScore - 15);
          hasWithdrawalPenalty = true;
        }
      }

      healthScore = baseScore;
    }

    if (healthScore >= 70) {
      healthStatusLabel = '🟢 Saudável';
      healthColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      healthBulletColor = 'bg-emerald-400';
      healthStatusMessage = 'Seu caixa está saudável. O negócio tem boa geração de lucro.';
    } else if (healthScore >= 45) {
      healthStatusLabel = '🟡 Atenção';
      healthColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      healthBulletColor = 'bg-amber-400';
      healthStatusMessage = 'Suas despesas aumentaram neste mês. Recomenda-se cautela.';
    } else {
      healthStatusLabel = '🔴 Crítico';
      healthColorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      healthBulletColor = 'bg-rose-400';
      healthStatusMessage = 'Seu lucro está crítico! Reavalie os custos e reduza despesas.';
    }

    if (hasWithdrawalPenalty) {
      healthStatusMessage = 'Suas despesas aumentaram e suas retiradas pessoais estão consumindo o caixa.';
    }
  }

  // Render Inner Content of Goal Tab
  const renderGoalContent = () => {
    const hasGoalSet = isPro ? (goal !== null && goal > 0) : true;

    if (!hasGoalSet) {
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-surface-container-low/50 border border-outline-variant/15 rounded-[20px] text-center gap-3 my-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-lg font-black">tour</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-on-surface">
              Defina sua meta de faturamento
            </p>
            <p className="text-[10px] text-on-surface-variant max-w-[200px]">
              Acompanhe quanto falta para alcançar seu objetivo.
            </p>
          </div>
          <button
            onClick={handleOpenGoalModal}
            className="px-3.5 py-1.5 bg-primary hover:bg-[#8455ef] text-white font-extrabold text-[11px] rounded-lg shadow-md cursor-pointer transition-all active:scale-95"
          >
            Definir Meta
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 mt-1 text-left">
        <div className="flex justify-between items-baseline">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-extrabold text-on-surface-variant tracking-wider leading-none">
              Faturamento Atual
            </span>
            <span className="text-xl font-black text-on-surface tracking-tight mt-1">
              {formatBRL(faturadoDisplay)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase font-extrabold text-on-surface-variant tracking-wider leading-none">
              Meta Alvo
            </span>
            <span className="text-xs font-bold text-primary mt-1">
              {formatBRL(goalValue)}
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden border border-outline-variant/10 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, goalPercentage)}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary to-[#8b6eff] rounded-full"
          />
        </div>
        
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between font-bold">
            <span className="text-on-surface">
              Você já atingiu <span className="text-primary font-black">{goalPercentage}%</span> da sua meta.
            </span>
            <span className="text-on-surface-variant">
              {goalMissing > 0 ? `Restam ${formatBRL(goalMissing)}` : 'Meta Superada!'}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80 font-medium italic mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-amber-400">tips_and_updates</span>
            {goalStatusMessage}
          </p>
        </div>
      </div>
    );
  };

  // Render Inner Content of Health Tab
  const renderHealthContent = () => {
    if (!hasHealthData) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center gap-2.5 bg-surface-container-low/50 border border-outline-variant/15 rounded-[20px] my-1">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-lg">query_stats</span>
          </div>
          <p className="text-xs font-bold text-on-surface">
            Sem dados suficientes
          </p>
          <p className="text-[10px] text-on-surface-variant max-w-[240px]">
            Lance suas receitas e despesas do mês atual para analisar a saúde do seu negócio.
          </p>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4 mt-1">
        {/* Left Side: Circular score gauge (extremely compact and neat!) */}
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="9"
              fill="transparent"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              stroke="url(#health-grad-panel)"
              strokeWidth="9"
              fill="transparent"
              strokeDasharray="263.8"
              initial={{ strokeDashoffset: 263.8 }}
              animate={{ strokeDashoffset: 263.8 - (263.8 * healthScore) / 100 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>

          {/* Centered Score */}
          <div className="absolute inset-0 flex items-center justify-center mt-0.5">
            <span className="text-lg font-black text-on-surface tracking-tight">
              {healthScore}
            </span>
          </div>
        </div>

        {/* Right Side: Diagnosis text (directly answers user intent in <5 seconds) */}
        <div className="flex flex-col gap-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-extrabold text-on-surface-variant/90 tracking-wider">
              Índice MCO
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-extrabold leading-none ${healthColorClass}`}>
              {healthStatusLabel}
            </span>
          </div>
          <p className="text-xs font-semibold text-on-surface leading-relaxed pr-1">
            {healthStatusMessage}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-[24px]">
        {/* Core unified glass-card layout */}
        <div className="glass-card rounded-[24px] p-6 shadow-xl flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl pointer-events-none"></div>

          {/* Title & Tabs Bar */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-left">
                <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base font-bold animate-pulse">monitoring</span> Painel de Crescimento PRO
                </h3>
                <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">
                  Análises Exclusivas de Negócio
                </span>
              </div>

              {/* Goal edit button only shown if Goal tab active, user is PRO and has goal */}
              {isPro && activeTab === 'goal' && goal !== null && goal > 0 && (
                <button
                  onClick={handleOpenGoalModal}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 border border-primary/25 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">edit</span>
                  Editar Meta
                </button>
              )}
            </div>

            {/* Segmented Controller (Switch tabs) */}
            <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
              <button
                type="button"
                onClick={() => setActiveTab('goal')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'goal'
                    ? 'bg-primary text-on-primary shadow-md font-black'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50'
                }`}
              >
                <span>🎯</span> Objetivo do Mês
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('health')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'health'
                    ? 'bg-primary text-on-primary shadow-md font-black'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">health_and_safety</span> Saúde Financeira
              </button>
            </div>
          </div>

          {/* Active Tab Renderer */}
          <div className="relative">
            {isPro ? (
              // Fully interactive view for PRO users
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'goal' ? renderGoalContent() : renderHealthContent()}
                </motion.div>
              </AnimatePresence>
            ) : (
              // Shared interactive locked state with blurred mock overlays for Essencial users!
              <div className="relative min-h-[110px] flex flex-col justify-center">
                {/* Simulated content container which is blurred */}
                <div className="filter blur-[5px] select-none pointer-events-none opacity-20">
                  {activeTab === 'goal' ? renderGoalContent() : renderHealthContent()}
                </div>

                {/* Clear, highly strategic marketing overlay directly integrated without card-in-card */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-2 max-w-[280px]"
                  >
                    <p className="text-[11px] text-on-surface-variant font-bold leading-relaxed">
                      {activeTab === 'goal'
                        ? '🎯 Acompanhe seu progresso de faturamento de forma simples e visual.'
                        : '📊 Tenha um diagnóstico de saúde automática através do Índice MCO.'}
                    </p>
                    <button
                      type="button"
                      onClick={onUnlockPro}
                      className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-primary to-[#8b6eff] text-on-primary font-black text-[10px] transition-all duration-300 flex items-center justify-center gap-1 border border-primary/30 shadow-[0_4px_12px_rgba(109,59,215,0.2)] hover:shadow-[0_4px_18px_rgba(109,59,215,0.4)] cursor-pointer active:scale-95 mt-1"
                    >
                      <span className="material-symbols-outlined text-xs">lock_open</span>
                      Liberar Saúde e Metas
                    </button>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goal Config Modal for PRO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-surface-container-high border border-white/10 rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden flex flex-col gap-5"
            >
              <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>

              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl font-bold">tour</span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-base font-black text-on-surface">
                  {goal !== null ? 'Editar Objetivo do Mês' : 'Definir Objetivo do Mês'}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  Insira o valor que você deseja faturar no mês atual.
                </p>
              </div>

              <form onSubmit={handleSaveGoal} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant/90">Valor da meta</label>
                  <div className="relative flex items-center bg-surface-container-low border-2 border-primary/60 rounded-2xl px-4 py-3.5 focus-within:shadow-[0_0_15px_rgba(160,120,255,0.25)] transition-all">
                    <span className="text-xl font-bold text-on-surface-variant/60 mr-2">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="10.000,00"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full bg-transparent border-none text-on-surface font-extrabold text-xl focus:outline-none placeholder:text-on-surface-variant/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-[#8b6eff] text-on-primary font-black text-xs transition-all duration-300 border border-primary/30 shadow-md cursor-pointer hover:brightness-110 active:scale-95"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface border border-outline-variant/15 transition-all text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
