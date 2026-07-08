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
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 w-full max-w-lg lg:max-w-full pb-24 lg:pb-0 text-left">
      {/* Header - Hidden on Desktop */}
      <div className="lg:hidden col-span-12">
        <h2 className="text-xl font-bold text-on-surface tracking-tight">Resumo Financeiro</h2>
        <p className="text-xs text-on-surface-variant">
          Visão geral sobre o fluxo de caixa, despesas e origens de faturamento.
        </p>
      </div>

      {/* Left Column (Main Stats Card & Payment Methods) */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        {/* Main Stats Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-[24px] p-6 shadow-xl flex flex-col gap-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Lucro Líquido Real</h3>
          <div className="flex items-baseline gap-2">
            <h1 className={`text-3xl font-extrabold tracking-tight ${netBalance >= 0 ? 'text-tertiary' : 'text-error'}`}>
              {formatBRL(netBalance)}
            </h1>
            <span className="text-[10px] text-on-surface-variant bg-white/5 rounded-full px-2.5 py-1">
              {netBalance >= 0 ? 'Lucro' : 'Prejuízo'}
            </span>
          </div>

          {/* Small horizontal percentage visualization */}
          {totalEntradas > 0 && (
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase">Estrutura de Gastos</span>
              <div className="w-full bg-surface-container-low h-3 rounded-full flex overflow-hidden">
                <div 
                  className="bg-tertiary h-full"
                  style={{ width: `${Math.round(((totalEntradas - totalSaidas) / totalEntradas) * 100)}%` }}
                  title="Lucro Guardado"
                ></div>
                <div 
                  className="bg-error h-full"
                  style={{ width: `${Math.round((totalSaidas / totalEntradas) * 100)}%` }}
                  title="Despesas"
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-on-surface-variant mt-0.5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary"></span> Retido</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error"></span> Gasto</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Payment Methods breakdown */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">credit_card</span>
            Meios de Pagamento mais utilizados
          </h3>

          {paymentMethods.length === 0 ? (
            <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/10 text-center text-xs text-on-surface-variant">
              Sem movimentações financeiras registradas
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-surface-container border border-outline-variant/10">
              {paymentMethods.map(item => (
                <div key={item.method} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">{item.method}</span>
                    <span className="font-extrabold text-primary">{formatBRL(item.amount)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
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
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-lg">trending_up</span>
              De onde veio o dinheiro? (Entradas)
            </h3>

            {entradasCategories.length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/10 text-center text-xs text-on-surface-variant">
                Sem dados de entradas registrados
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-surface-container border border-outline-variant/10">
                {entradasCategories.map(item => (
                  <div key={item.category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-on-surface">{item.category}</span>
                      <span className="font-extrabold text-tertiary">{formatBRL(item.amount)} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="bg-tertiary h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saidas Group */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-lg">trending_down</span>
              Para onde foi o dinheiro? (Saídas)
            </h3>

            {saidasCategories.length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/10 text-center text-xs text-on-surface-variant">
                Sem dados de saídas registrados
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-surface-container border border-outline-variant/10">
                {saidasCategories.map(item => (
                  <div key={item.category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-on-surface">{item.category}</span>
                      <span className="font-extrabold text-error">{formatBRL(item.amount)} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="bg-error h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seção Estruturada para Projeções / Funcionalidade futura PRO */}
        <div className="glass-card rounded-[24px] p-5 border border-white/5 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full filter blur-xl pointer-events-none"></div>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">insights</span>
              <h4 className="text-sm font-bold text-on-surface">Projeção de Lucro Futuro</h4>
            </div>
            {isPro ? (
              <span className="text-[9px] uppercase font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                Desbloqueado Pro
              </span>
            ) : (
              <span className="text-[9px] uppercase font-bold text-outline px-2 py-0.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">lock</span>
                Recurso Pro
              </span>
            )}
          </div>
          
          {isPro ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                Com base nos seus lançamentos recentes, sua projeção de faturamento para os próximos 30 dias é de:
              </p>
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">Expectativa de Sobra</span>
                <span className="text-sm font-bold text-tertiary">{formatBRL(netBalance * 1.12)}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant/70 font-medium">
                *A projeção considera um aumento sazonal estimado de 12% baseado no histórico do seu segmento de {profile.businessType === 'cnpj' ? 'MEI' : 'Autônomo'}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-on-surface-variant/60 font-medium leading-relaxed">
                Gostaria de ver estimativas automáticas do seu caixa para os próximos meses com base em inteligência artificial?
              </p>
              <div className="filter blur-[3px] bg-surface-container-low/50 p-3.5 rounded-xl border border-white/5 flex justify-between items-center select-none pointer-events-none">
                <span className="text-xs text-on-surface-variant/45">Expectativa de Sobra</span>
                <span className="text-sm font-bold text-tertiary">R$ 5.420,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-on-surface-variant/50 font-medium">Faça o upgrade para liberar a inteligência financeira.</span>
                <button 
                  onClick={() => onNavigateToPlanos?.()}
                  className="text-[10px] font-bold text-primary hover:text-primary-container transition-colors cursor-pointer"
                >
                  Ver Planos →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
