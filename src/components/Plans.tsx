import React from 'react';
import { motion } from 'motion/react';
import { UserProfile, PlanType } from '../types';

const CHECKOUT_PRO_URL = import.meta.env.VITE_CHECKOUT_PRO_URL || 'https://pay.kiwify.com.br/exemplo-checkout';

interface PlansProps {
  profile: UserProfile;
  onUpdatePlan: (plan: PlanType) => Promise<void>;
  onNavigateToTab: (tab: 'dashboard' | 'historico' | 'retirar' | 'resumo') => void;
}

export default function Plans({ profile, onUpdatePlan, onNavigateToTab }: PlansProps) {
  const currentPlan = profile.plan || 'essential';
  const [loadingPlan, setLoadingPlan] = React.useState<PlanType | null>(null);
  const [showProModal, setShowProModal] = React.useState(false);

  const handleSelectPlan = async (plan: PlanType) => {
    if (plan === currentPlan) return;
    
    if (plan === 'pro') {
      setShowProModal(true);
      return;
    }

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
      price: '37,00',
      pricePrefix: 'R$',
      period: 'Taxa Única',
      subPeriod: 'Acesso Vitalício',
      badge: 'Básico',
      description: 'Perfeito para autônomos e MEI estruturarem as bases do controle financeiro.',
      icon: 'star_outline',
      color: 'from-slate-500/10 via-slate-500/5 to-transparent',
      borderColor: 'border-white/10',
      iconBg: 'bg-white/5 border-white/10 text-slate-400',
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
      price: '15,90',
      pricePrefix: 'Por mais R$',
      period: 'Adicional Único',
      subPeriod: 'Acesso Vitalício',
      badge: '🔥 RECOMENDADO',
      description: 'Desbloqueie relatórios completos, metas automáticas de economia e múltiplos caixas adicionais.',
      icon: 'workspace_premium',
      color: 'from-primary/20 via-primary/5 to-transparent',
      borderColor: 'border-primary/45',
      iconBg: 'bg-primary/15 border-primary/30 text-primary',
      features: [
        { name: 'Lançamentos de entrada e saída', status: 'yes' },
        { name: 'Histórico completo de transações', status: 'yes' },
        { name: 'Sincronização em nuvem básica', status: 'yes' },
        { name: 'Controle de categorias e pagamentos', status: 'yes' },
        { name: 'Painel de resumo e estatísticas', status: 'yes' },
        { name: 'Relatórios avançados em PDF/Excel', status: 'yes', highlight: true },
        { name: 'Metas e alertas inteligentes', status: 'yes', highlight: true },
        { name: 'Múltiplos caixas / contas', status: 'yes', highlight: true },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-primary font-bold tracking-widest uppercase bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            Seu Plano Atual: {currentPlan === 'pro' ? 'Pro' : 'Essential'}
          </span>
          <h2 className="text-2xl font-black text-on-surface tracking-tight mt-3">
            Evolua seu <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-primary-container">Controle</span>
          </h2>
          <p className="text-xs text-on-surface-variant font-medium">
            Planos sem taxas ocultas, sem assinaturas e sem fidelidade.
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
          const isPro = plan.id === 'pro';
          const isDowngradeDisabled = currentPlan === 'pro' && plan.id === 'essential';

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card rounded-[28px] p-6 shadow-xl flex flex-col gap-5 border transition-all relative overflow-hidden bg-gradient-to-br ${plan.color} ${
                isActive 
                  ? `${plan.borderColor} ring-1 ring-primary/20` 
                  : isPro 
                    ? 'border-primary/20 hover:border-primary/45' 
                    : isDowngradeDisabled
                      ? 'border-white/5 opacity-80'
                      : 'border-white/5 hover:border-white/10'
              }`}
            >
              {/* Highlight badge for PRO */}
              {!isActive && isPro && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-[#8b6eff] text-on-primary font-black text-[9px] tracking-wider px-4 py-1.5 rounded-bl-2xl shadow-sm uppercase select-none">
                  {plan.badge}
                </div>
              )}

              {/* Highlight background glow */}
              {isPro && (
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/15 rounded-full filter blur-3xl pointer-events-none"></div>
              )}

              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${plan.iconBg}`}>
                    <span className="material-symbols-outlined text-2xl">
                      {plan.icon}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black text-on-surface flex items-center gap-1.5">
                      {plan.name}
                      {isActive && (
                        <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-primary">
                          Ativo
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="flex items-start select-none">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider mr-1 mt-0.5 leading-none ${isPro ? 'text-primary/80' : 'text-on-surface-variant'}`}>
                      {plan.pricePrefix}
                    </span>
                    <div className={`text-3xl font-black tracking-tight leading-none ${isPro ? 'text-primary' : 'text-on-surface'}`}>
                      {plan.price}
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 mt-1.5 uppercase tracking-wider">
                    {plan.subPeriod}
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
                disabled={isActive || loadingPlan !== null || isDowngradeDisabled}
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 border select-none ${
                  isActive
                    ? 'bg-transparent border-white/10 text-on-surface-variant/40 cursor-default'
                    : isDowngradeDisabled
                      ? 'bg-white/5 border-white/5 text-on-surface-variant/35 cursor-not-allowed'
                      : isPro
                        ? 'bg-primary hover:bg-[#c0aeff] text-on-primary border-primary/30 shadow-[0_4px_16px_rgba(109,59,215,0.25)] hover:shadow-[0_6px_22px_rgba(109,59,215,0.45)] hover:-translate-y-0.5 cursor-pointer'
                        : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-outline-variant/30 hover:-translate-y-0.5 cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isActive ? (
                  <>
                    <span className="material-symbols-outlined text-sm font-black">check</span>
                    Seu Plano Ativo
                  </>
                ) : isDowngradeDisabled ? (
                  <>
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Downgrade Indisponível
                  </>
                ) : isPro ? (
                  <>
                    <span className="material-symbols-outlined text-sm">workspace_premium</span>
                    Garantir Acesso PRO Vitalício
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">star_outline</span>
                    Ativar Plano Essential
                  </>
                )}
              </button>

              {/* Features List */}
              <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                <span className="text-[10px] font-extrabold text-on-surface-variant/85 tracking-wider uppercase">
                  O que está incluso:
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {plan.features.map((feature, idx) => {
                    const isIncluded = feature.status === 'yes';
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2.5 text-on-surface-variant">
                          <span className={`material-symbols-outlined text-base ${
                            isIncluded 
                              ? isPro && feature.highlight 
                                ? 'text-primary' 
                                : 'text-emerald-400' 
                              : 'text-on-surface-variant/20'
                          }`}>
                            {isIncluded ? 'check_circle' : 'cancel'}
                          </span>
                          <span className={`${
                            isIncluded 
                              ? isPro && feature.highlight 
                                ? 'text-on-surface font-semibold' 
                                : 'text-on-surface' 
                              : 'text-on-surface-variant/30'
                          }`}>
                            {feature.name}
                          </span>
                        </div>
                        {!isIncluded && (
                          <span className="text-[9px] uppercase font-extrabold text-primary px-2 py-0.5 rounded bg-primary/5 border border-primary/10">
                            PRO
                          </span>
                        )}
                        {isIncluded && isPro && feature.highlight && (
                          <span className="text-[8px] uppercase font-extrabold text-amber-300 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                            EXCLUSIVO
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

      {/* Trust Signpost / Conversion Guarantee */}
      <div className="glass-card rounded-[24px] p-5 border border-white/5 flex gap-4 bg-primary/5">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <span className="material-symbols-outlined text-lg">verified_user</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-black text-on-surface">Garantia de Satisfação Total</span>
          <p className="text-[11px] text-on-surface-variant/90 leading-relaxed font-medium">
            Seu pagamento é processado de forma 100% segura. Sem mensalidades perpétuas ou pegadinhas de assinatura recorrente. Uma vez adquirido, o acesso à sua conta é vitalício, incluindo todas as futuras atualizações e novos recursos!
          </p>
        </div>
      </div>

      {/* Modal de confirmação/aquisição do Plano PRO */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md bg-surface-container-high border border-white/10 rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden flex flex-col gap-5"
          >
            {/* Background premium gradient glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full filter blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full filter blur-3xl pointer-events-none"></div>

            {/* Icon decoration */}
            <div className="mx-auto w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
              <span className="material-symbols-outlined text-3xl animate-pulse">workspace_premium</span>
              <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
                PRO
              </span>
            </div>

            {/* Warning Message */}
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-black text-on-surface tracking-tight leading-snug">
                Você ainda não tem acesso ao Plano PRO.
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                Libere recursos avançados como relatórios completos em PDF/Excel, metas de economia automáticas com IA, múltiplos caixas de controle e suporte prioritário!
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 mt-2">
              <a
                href={CHECKOUT_PRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowProModal(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-[#8b6eff] hover:from-[#8b6eff] hover:to-[#a18cff] text-on-primary font-black text-xs transition-all duration-300 flex items-center justify-center gap-2 border border-primary/30 shadow-[0_6px_24px_rgba(109,59,215,0.35)] hover:shadow-[0_8px_30px_rgba(109,59,215,0.55)] hover:-translate-y-0.5 select-none text-center"
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                Quero Acessar o PRO.
              </a>
              
              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="w-full py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all duration-200 text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
            </div>

            {/* Security Note */}
            <span className="text-[10px] text-on-surface-variant/60 font-semibold flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-xs">lock</span>
              Pagamento 100% seguro & acesso vitalício imediato.
            </span>
          </motion.div>
        </div>
      )}
    </div>
  );
}
