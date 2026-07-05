import React from 'react';
import { motion } from 'motion/react';
import { UserProfile, PlanType } from '../types';

interface PlansProps {
  profile: UserProfile;
  onUpdatePlan: (plan: PlanType) => Promise<void>;
  onNavigateToTab: (tab: 'dashboard' | 'historico' | 'retirar' | 'resumo') => void;
}

export default function Plans({ profile, onUpdatePlan, onNavigateToTab }: PlansProps) {
  const currentPlan = profile.plan || 'essential';
  const [loadingPlan, setLoadingPlan] = React.useState<PlanType | null>(null);

  const handleSelectPlan = async (plan: PlanType) => {
    if (plan === currentPlan) return;
    setLoadingPlan(plan);
    try {
      await onUpdatePlan(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(null);
    }
  };

  const PLANS_INFO = [
    {
      id: 'essential' as PlanType,
      name: 'Essential',
      price: 'Grátis',
      period: 'para sempre',
      description: 'Ideal para autônomos e MEI começando a organizar o fluxo de caixa.',
      icon: 'star_outline',
      color: 'from-slate-500/10 to-slate-400/5',
      borderColor: 'border-white/10',
      tagColor: 'bg-white/10 text-on-surface-variant',
      features: [
        { name: 'Lançamentos de entrada e saída', status: 'yes' },
        { name: 'Histórico completo de transações', status: 'yes' },
        { name: 'Sincronização em nuvem básica', status: 'yes' },
        { name: 'Controle de categorias e pagamentos', status: 'yes' },
        { name: 'Painel de resumo e estatísticas', status: 'yes' },
        { name: 'Relatórios avançados em PDF/Excel', status: 'no', description: 'Exclusivo Pro' },
        { name: 'Metas e alertas inteligentes', status: 'no', description: 'Exclusivo Pro' },
        { name: 'Múltiplos caixas / contas', status: 'no', description: 'Exclusivo Pro' },
      ]
    },
    {
      id: 'pro' as PlanType,
      name: 'Pro',
      price: 'R$ 29,90',
      period: 'por mês',
      description: 'Ferramentas avançadas para empresas que buscam crescimento e controle rigoroso.',
      icon: 'workspace_premium',
      color: 'from-primary/20 to-primary/5',
      borderColor: 'border-primary/40',
      tagColor: 'bg-primary/25 text-primary',
      features: [
        { name: 'Lançamentos de entrada e saída', status: 'yes' },
        { name: 'Histórico completo de transações', status: 'yes' },
        { name: 'Sincronização em nuvem básica', status: 'yes' },
        { name: 'Controle de categorias e pagamentos', status: 'yes' },
        { name: 'Painel de resumo e estatísticas', status: 'yes' },
        { name: 'Relatórios avançados em PDF/Excel', status: 'yes' },
        { name: 'Metas e alertas inteligentes', status: 'yes' },
        { name: 'Múltiplos caixas / contas', status: 'yes' },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-primary font-bold tracking-wider uppercase">
            Plano {currentPlan === 'pro' ? 'Pro Ativo' : 'Essential Ativo'}
          </span>
          <h2 className="text-xl font-bold text-on-surface tracking-tight">
            Gerenciar <span className="text-primary">Planos</span>
          </h2>
          <p className="text-xs text-on-surface-variant">
            Estrutura de planos para evolução do seu negócio
          </p>
        </div>
        <button
          onClick={() => onNavigateToTab('dashboard')}
          className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center cursor-pointer transition-colors"
          title="Voltar ao Painel"
        >
          <span className="material-symbols-outlined text-on-surface text-xl">arrow_back</span>
        </button>
      </div>

      {/* Plans comparison cards */}
      <div className="flex flex-col gap-6">
        {PLANS_INFO.map((plan) => {
          const isActive = currentPlan === plan.id;
          const isLoading = loadingPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card rounded-[28px] p-6 shadow-xl flex flex-col gap-5 border transition-all relative overflow-hidden bg-gradient-to-br ${plan.color} ${
                isActive ? `${plan.borderColor} ring-1 ring-primary/20` : 'border-white/5'
              }`}
            >
              {/* Highlight background shine for active or Pro */}
              {plan.id === 'pro' && (
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>
              )}

              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    isActive ? 'bg-primary/15 border-primary/35' : 'bg-white/5 border-white/10'
                  }`}>
                    <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {plan.icon}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                      {plan.name}
                      {isActive && (
                        <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary">
                          Ativo
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      Plano {plan.name === 'Pro' ? 'Profissional' : 'Essencial'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-extrabold text-on-surface">
                    {plan.price}
                  </div>
                  <div className="text-[9px] text-on-surface-variant font-medium uppercase tracking-wider">
                    {plan.period}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                {plan.description}
              </p>

              {/* CTA Button */}
              <button
                type="button"
                disabled={isActive || loadingPlan !== null}
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-3 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border select-none ${
                  isActive
                    ? 'bg-transparent border-white/10 text-on-surface-variant/50 cursor-default'
                    : plan.id === 'pro'
                      ? 'bg-primary hover:bg-[#c0aeff] text-on-primary border-primary/30 shadow-[0_4px_12px_rgba(109,59,215,0.15)] hover:shadow-[0_6px_18px_rgba(109,59,215,0.3)] cursor-pointer'
                      : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-outline-variant/30 cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isActive ? (
                  <>
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                    Plano Ativo no Momento
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">
                      {plan.id === 'pro' ? 'workspace_premium' : 'star_outline'}
                    </span>
                    Ativar Plano {plan.name}
                  </>
                )}
              </button>

              {/* Features List */}
              <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-on-surface-variant/80 tracking-wider uppercase">
                  O que está incluso:
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {plan.features.map((feature, idx) => {
                    const isIncluded = feature.status === 'yes';
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className={`material-symbols-outlined text-base ${
                            isIncluded ? 'text-primary' : 'text-on-surface-variant/20'
                          }`}>
                            {isIncluded ? 'check_circle' : 'cancel'}
                          </span>
                          <span className={isIncluded ? 'text-on-surface' : 'text-on-surface-variant/40'}>
                            {feature.name}
                          </span>
                        </div>
                        {!isIncluded && (
                          <span className="text-[9px] uppercase font-bold text-primary px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10">
                            PRO
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Card on plan segmentation logic */}
      <div className="glass-card rounded-[24px] p-5 border border-white/5 flex gap-4 bg-primary/5">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <span className="material-symbols-outlined text-lg">info</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-on-surface">Estrutura Pronta</span>
          <p className="text-[11px] text-on-surface-variant/90 leading-relaxed font-medium">
            A diferenciação de recursos entre **Essential** e **Pro** está estruturada no código-fonte! No futuro, poderemos bloquear ou adicionar funcionalidades exclusivas para usuários Pro simplesmente verificando o atributo `profile.plan`.
          </p>
        </div>
      </div>
    </div>
  );
}
