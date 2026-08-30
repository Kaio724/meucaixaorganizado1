import React from 'react';
import { motion } from 'motion/react';
import { Transaction, UserProfile } from '../types';

interface SummaryProps {
  transactions: Transaction[];
  profile: UserProfile;
  onNavigateToPlanos?: () => void;
}

export default function Summary({ transactions, profile, onNavigateToPlanos }: SummaryProps) {
  const isPro = (profile.plan || 'essential') === 'pro';

  // Calculations
  const totalEntradas = transactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalEntradas - totalSaidas;

  // Group by category helper
  const getCategoryBreakdown = (type: 'entrada' | 'saida') => {
    const list = transactions.filter(t => t.type === type);
    const total = list.reduce((sum, t) => sum + t.amount, 0);
    
    const groups: { [cat: string]: number } = {};
    list.forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });

    return Object.keys(groups)
      .map(cat => ({
        category: cat,
        amount: groups[cat],
        percentage: total > 0 ? Math.round((groups[cat] / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Group by payment method helper
  const getPaymentMethodBreakdown = () => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const groups: { [method: string]: number } = {};
    transactions.forEach(t => {
      groups[t.paymentMethod] = (groups[t.paymentMethod] || 0) + t.amount;
    });

    return Object.keys(groups)
      .map(method => ({
        method,
        amount: groups[method],
        percentage: total > 0 ? Math.round((groups[method] / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const entradasCategories = getCategoryBreakdown('entrada');
  const saidasCategories = getCategoryBreakdown('saida');
  const paymentMethods = getPaymentMethodBreakdown();

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 w-full max-w-lg md:max-w-4xl lg:max-w-full pb-24 lg:pb-0 text-left">
      {/* Header */}
      <div className="col-span-12 px-1">
        <div className="flex items-center gap-3 bg-[#140f24]/90 p-5 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(208,188,255,0.2)]">
            <span className="material-symbols-outlined text-2xl font-bold">bar_chart</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/25">
              Demonstrativo
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              Resumo Financeiro da Empresa
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Visão geral sobre o fluxo de caixa, despesas e origens de faturamento.
            </p>
          </div>
        </div>
      </div>

      {/* Left Column (Main Stats Card & Payment Methods) */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        {/* Main Stats Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[28px] p-5 sm:p-6 border border-white/10 bg-gradient-to-b from-[#1b1531] via-[#140e26] to-[#0e0a1b] shadow-2xl flex flex-col gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Lucro Líquido Real</h3>
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
              netBalance >= 0 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              {netBalance >= 0 ? 'Lucro' : 'Prejuízo'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatBRL(netBalance)}
            </h1>
          </div>

          {/* Small horizontal percentage visualization */}
          {totalEntradas > 0 && (
            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-white/5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Estrutura de Gastos</span>
              <div className="w-full bg-black/40 h-3 rounded-full flex overflow-hidden border border-white/5 p-0.5">
                <div 
                  className="bg-emerald-400 h-full rounded-l-full transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.round(((totalEntradas - totalSaidas) / totalEntradas) * 100))}%` }}
                  title="Lucro Guardado"
                ></div>
                <div 
                  className="bg-rose-400 h-full rounded-r-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((totalSaidas / totalEntradas) * 100))}%` }}
                  title="Despesas"
                ></div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mt-0.5">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Retido ({Math.max(0, Math.round(((totalEntradas - totalSaidas) / totalEntradas) * 100))}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Gasto ({Math.min(100, Math.round((totalSaidas / totalEntradas) * 100))}%)</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Payment Methods breakdown */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-primary text-base">credit_card</span>
            Meios de Pagamento mais utilizados
          </h3>

          {paymentMethods.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#140f24]/60 border border-white/5 text-center text-xs text-zinc-500">
              Sem movimentações financeiras registradas
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#120e20]/80 border border-white/5 backdrop-blur-md">
              {paymentMethods.map(item => (
                <div key={item.method} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{item.method}</span>
                    <span className="font-extrabold text-primary">{formatBRL(item.amount)} <span className="text-zinc-500 font-normal">({item.percentage}%)</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-[#bca1f7] h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column (Categories Distribution & Projections) */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        {/* Category distribution groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Entradas Group */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-emerald-400 text-base">trending_up</span>
              De onde veio? (Entradas)
            </h3>

            {entradasCategories.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#140f24]/60 border border-white/5 text-center text-xs text-zinc-500">
                Sem dados de entradas registrados
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#120e20]/80 border border-white/5 backdrop-blur-md">
                {entradasCategories.map(item => (
                  <div key={item.category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate">{item.category}</span>
                      <span className="font-extrabold text-emerald-400 shrink-0">{formatBRL(item.amount)} <span className="text-zinc-500 font-normal">({item.percentage}%)</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saidas Group */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-rose-400 text-base">trending_down</span>
              Para onde foi? (Saídas)
            </h3>

            {saidasCategories.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#140f24]/60 border border-white/5 text-center text-xs text-zinc-500">
                Sem dados de saídas registrados
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#120e20]/80 border border-white/5 backdrop-blur-md">
                {saidasCategories.map(item => (
                  <div key={item.category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate">{item.category}</span>
                      <span className="font-extrabold text-rose-400 shrink-0">{formatBRL(item.amount)} <span className="text-zinc-500 font-normal">({item.percentage}%)</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="bg-rose-400 h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seção Estruturada para Projeções / Funcionalidade futura PRO */}
        <div className="rounded-[28px] p-5 sm:p-6 border border-primary/20 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-[#1b1531] to-[#100c1d] shadow-xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full filter blur-2xl pointer-events-none"></div>
          
          <div className="flex items-start justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-base">insights</span>
              </div>
              <h4 className="text-sm font-extrabold text-white">Projeção de Lucro Futuro</h4>
            </div>
            {isPro ? (
              <span className="text-[9px] uppercase font-extrabold text-primary px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30">
                Desbloqueado MCO Completo
              </span>
            ) : (
              <span className="text-[9px] uppercase font-bold text-zinc-400 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">lock</span>
                Recurso MCO Completo
              </span>
            )}
          </div>
          
          {isPro ? (
            <div className="flex flex-col gap-3 z-10">
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                Com base nos seus lançamentos recentes, sua projeção de faturamento para os próximos 30 dias é de:
              </p>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <span className="text-xs text-zinc-400 font-semibold">Expectativa de Sobra</span>
                <span className="text-base font-extrabold text-emerald-400">{formatBRL(netBalance * 1.12)}</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">
                *A projeção considera um aumento sazonal estimado de 12% baseado no histórico do seu segmento de {profile.businessType === 'cnpj' ? 'MEI' : 'Autônomo'}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 z-10">
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                Gostaria de ver estimativas automáticas do seu caixa para os próximos meses com base em inteligência artificial?
              </p>
              <div className="filter blur-[3px] bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center select-none pointer-events-none">
                <span className="text-xs text-zinc-400">Expectativa de Sobra</span>
                <span className="text-sm font-bold text-emerald-400">R$ 5.420,00</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-zinc-500 font-medium">Faça o upgrade para liberar a inteligência financeira.</span>
                <button 
                  onClick={() => onNavigateToPlanos?.()}
                  className="text-xs font-extrabold text-primary hover:text-[#bca1f7] transition-colors cursor-pointer flex items-center gap-1"
                >
                  Ver Planos <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
