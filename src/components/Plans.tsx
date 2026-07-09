import React from 'react';
import { motion } from 'motion/react';
import { UserProfile, PlanType } from '../types';

const CHECKOUT_PRO_URL = import.meta.env.VITE_CHECKOUT_PRO_URL || 'https://pay.cakto.com.br/rdvxqwt';

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

  return (
    <div className="flex flex-col gap-8 w-full max-w-lg md:max-w-4xl lg:max-w-full pb-24 lg:pb-0 px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col gap-2.5 text-left col-span-12">
          <span className="self-start text-[9px] text-primary/90 font-bold tracking-widest uppercase bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full leading-none">
            Plano Atual: {currentPlan === 'pro' ? 'Pro' : 'Essencial'}
          </span>
          <h2 className="text-xl sm:text-2xl font-light text-on-surface tracking-tight mt-1">
            Escolha o plano ideal para o seu negócio
          </h2>
          <p className="text-xs text-on-surface-variant/70 font-normal leading-relaxed max-w-sm">
            Controle financeiro simples hoje. <br />
            Recursos inteligentes para crescer amanhã.
          </p>
        </div>
        <button
          onClick={() => onNavigateToTab('dashboard')}
          className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center cursor-pointer transition-colors shrink-0 mt-1 lg:hidden"
          title="Voltar ao Painel"
        >
          <span className="material-symbols-outlined text-on-surface/80 text-lg">arrow_back</span>
        </button>
      </div>

      {/* Plans comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card Essencial */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`glass-card rounded-[24px] p-5.5 sm:p-6 border flex flex-col gap-5 bg-gradient-to-br from-white/[0.01] to-transparent ${
            currentPlan === 'essential'
              ? 'border-white/10 ring-1 ring-white/5'
              : 'border-white/5 opacity-90'
          }`}
        >
          {/* Top Info */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-on-surface">Essencial</h3>
                <span className="text-[9px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-on-surface-variant/80">
                  Plano de Entrada
                </span>
              </div>
              <p className="text-xs text-on-surface-variant/80 leading-relaxed font-normal">
                Ideal para autônomos, MEIs e pequenos empreendedores que desejam organizar o fluxo de caixa de forma prática.
              </p>
            </div>
          </div>

          {/* Price Layout */}
          <div className="flex items-baseline gap-2.5 text-left py-1">
            <span className="text-3xl font-extrabold text-on-surface tracking-tight">R$ 19,90</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded w-max leading-none">
                Acesso Vitalício
              </span>
              <span className="text-[9px] text-on-surface-variant/60 font-medium mt-1 leading-none">
                Pagamento único
              </span>
            </div>
          </div>

          {/* Button */}
          {currentPlan === 'pro' ? (
            <button
              disabled
              className="w-full py-3 rounded-xl text-xs font-semibold bg-white/[0.02] border border-white/5 text-on-surface-variant/40 cursor-not-allowed text-center transition-all"
            >
              Seu plano atual oferece recursos superiores.
            </button>
          ) : currentPlan === 'essential' ? (
            <button
              disabled
              className="w-full py-3 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-on-surface-variant/70 cursor-default text-center transition-all"
            >
              Seu Plano Ativo
            </button>
          ) : (
            <button
              onClick={() => handleSelectPlan('essential')}
              className="w-full py-3 rounded-xl text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 hover:-translate-y-0.5 cursor-pointer text-center transition-all"
            >
              Ativar Plano Essencial
            </button>
          )}

          {/* Division */}
          <div className="border-t border-white/5" />

          {/* Included Features */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-bold text-on-surface-variant/60 tracking-wider uppercase text-left leading-none">
              Recursos inclusos
            </span>
            <div className="flex flex-col gap-2.5 text-left">
              {[
                'Dashboard Financeiro',
                'Entradas e Saídas',
                'Histórico Completo',
                'Categorias',
                'Relatórios Financeiros',
                'Controle Financeiro',
                'Acesso Vitalício'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-xs text-emerald-400 select-none">check</span>
                  <span className="font-normal">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider to premium features lock */}
          <div className="border-t border-white/5" />

          {/* Locked Pro features (SaaS design, premium look, natural evolution) */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-bold text-on-surface-variant/50 tracking-wider uppercase text-left leading-none">
              Recursos disponíveis apenas no PRO
            </span>
            <div className="flex flex-col gap-2.5 text-left opacity-60">
              {[
                'Comparativo entre meses',
                'Metas Financeiras',
                'Indicador de Saúde Financeira',
                'Atualizações Vitalícias',
                'Recursos exclusivos futuros'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-on-surface-variant/75">
                  <span className="material-symbols-outlined text-xs text-on-surface-variant/40 select-none">arrow_forward</span>
                  <span className="font-normal">{feature}</span>
                </div>
              ))}
            </div>
          </div>

        </motion.div>

        {/* Card PRO (70% Attention weight, elegant, spacious, quiet sophistication) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className={`glass-card rounded-[24px] p-6.5 sm:p-8 border flex flex-col gap-6 relative overflow-hidden bg-gradient-to-b from-primary/[0.04] to-transparent ${
            currentPlan === 'pro'
              ? 'border-primary/45 ring-1 ring-primary/20'
              : 'border-primary/25 hover:border-primary/45 transition-all duration-300'
          }`}
        >
          {/* Subtle gradient light flare background for the PRO card */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary/10 rounded-full filter blur-3xl pointer-events-none"></div>

          {/* Top Info */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2 text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-on-surface">Pro</h3>
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed font-normal">
                Transforme seus lançamentos em informações estratégicas. Acompanhe a evolução do seu negócio, estabeleça metas e tenha acesso permanente às próximas atualizações do MCO.
              </p>
            </div>
          </div>

          {/* Price Layout (Big emphasis, beautifully integrated) */}
          <div className="flex items-baseline justify-between py-1 border-b border-primary/10 pb-4">
            <div className="flex items-baseline gap-2 text-left">
              <span className="text-4xl font-extrabold text-primary tracking-tight">R$ 17,90</span>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded w-max leading-none mb-1">
                  Valor do Upgrade
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  Acesso Vitalício
                </span>
                <span className="text-[9px] text-on-surface-variant/70 font-medium mt-0.5">
                  Pagamento único
                </span>
              </div>
            </div>
          </div>

          {/* CTA Upgrade Button */}
          {currentPlan === 'pro' ? (
            <button
              disabled
              className="w-full py-3.5 rounded-xl text-xs font-bold bg-primary/10 border border-primary/20 text-primary cursor-default text-center transition-all"
            >
              Seu Plano Ativo
            </button>
          ) : (
            <a
              href={CHECKOUT_PRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl text-xs font-black bg-primary hover:bg-[#c0aeff] text-on-primary border border-primary/30 transition-all duration-200 shadow-[0_4px_12px_rgba(160,120,255,0.15)] hover:shadow-[0_6px_20px_rgba(160,120,255,0.3)] hover:-translate-y-0.5 cursor-pointer text-center flex items-center justify-center select-none"
            >
              Fazer Upgrade
            </a>
          )}

          {/* Features Checklist */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-bold text-primary/80 tracking-wider uppercase text-left leading-none">
              Tudo do Plano Essencial +
            </span>
            <div className="flex flex-col gap-2.5 text-left">
              {[
                'Comparativo Financeiro entre Meses',
                'Metas de Faturamento',
                'Indicador de Saúde Financeira',
                'Atualizações Vitalícias',
                'Novos Recursos Exclusivos',
                'Prioridade nas próximas funcionalidades'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-on-surface">
                  <span className="material-symbols-outlined text-xs text-primary select-none font-semibold">check_circle</span>
                  <span className="font-normal leading-tight">{feature}</span>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>

      {/* Trust Signpost / Conversion Guarantee */}
      <div className="glass-card rounded-[20px] p-5 border border-white/5 flex gap-4 bg-primary/5 text-left">
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <span className="material-symbols-outlined text-base">verified_user</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-on-surface">Acesso Permanente Garantido</span>
          <p className="text-[10px] text-on-surface-variant/85 leading-relaxed font-normal">
            Seu pagamento é único e processado com segurança integral. Não cobramos mensalidades, assinaturas ou taxas extras futuras. Seu acesso é vitalício, incluindo qualquer melhoria e novos recursos exclusivos desenvolvidos para o MCO.
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
            className="w-full max-w-md bg-surface-container-high border border-white/10 rounded-[24px] p-6 text-center shadow-2xl relative overflow-hidden flex flex-col gap-5"
          >
            {/* Background premium gradient glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full filter blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full filter blur-3xl pointer-events-none"></div>

            {/* Icon decoration */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
              <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
                PRO
              </span>
            </div>

            {/* Warning Message */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-bold text-on-surface tracking-tight leading-snug">
                Você ainda não tem acesso ao Plano PRO.
              </h3>
              <p className="text-xs text-on-surface-variant/80 leading-relaxed font-normal">
                Libere recursos avançados como relatórios completos em PDF/Excel, metas de economia automáticas com IA, múltiplos caixas de controle e suporte prioritário!
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 mt-1">
              <a
                href={CHECKOUT_PRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowProModal(false)}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-[#c0aeff] text-on-primary font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 border border-primary/30 shadow-[0_4px_12px_rgba(160,120,255,0.15)] hover:shadow-[0_6px_20px_rgba(160,120,255,0.3)] select-none text-center"
              >
                <span className="material-symbols-outlined text-sm">shopping_bag</span>
                Quero Acessar o PRO
              </a>
              
              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="w-full py-3 rounded-xl bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all duration-200 text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
            </div>

            {/* Security Note */}
            <span className="text-[10px] text-on-surface-variant/60 font-semibold flex items-center justify-center gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">lock</span>
              Pagamento 100% seguro & acesso vitalício imediato.
            </span>
          </motion.div>
        </div>
      )}
    </div>
  );
}
