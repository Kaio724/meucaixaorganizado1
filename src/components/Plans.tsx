import React from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

const CHECKOUT_PRO_URL = import.meta.env.VITE_CHECKOUT_PRO_URL || 'https://checkout.wiven.com.br/checkout/cmr9mqf4p000j01q0qlrqcl4w?offer=LEJVTNC';

interface PlansProps {
  profile: UserProfile;
  onUpdatePlan?: (plan: any) => Promise<void>;
  onNavigateToTab: (tab: 'dashboard' | 'historico' | 'retirar' | 'resumo') => void;
  onShowUpgradeCelebration?: () => void;
}

export default function Plans({ profile, onNavigateToTab }: PlansProps) {
  const isVitalicio = true;

  const features = [
    {
      icon: 'domain',
      title: 'Gestão Empresarial Completa',
      description: 'Entradas, saídas, fluxo de caixa diário e relatórios detalhados'
    },
    {
      icon: 'person',
      title: 'Conta Pessoal Integrada (PF + PJ)',
      description: 'Separe 100% suas contas pessoais dos custos da empresa com um toque'
    },
    {
      icon: 'repeat',
      title: 'Contas Fixas & Variáveis',
      description: 'Previsibilidade completa de custos operacionais e receitas recorrentes'
    },
    {
      icon: 'calendar_month',
      title: 'Contas a Pagar e a Receber',
      description: 'Gestão de vencimentos, pendências em atraso e baixa com valor efetivo'
    },
    {
      icon: 'track_changes',
      title: 'Metas e Orçamentos Financeiros',
      description: 'Defina metas de faturamento e tetos de gastos por categorias'
    },
    {
      icon: 'psychology',
      title: 'Assistente Financeiro com IA',
      description: 'Análise automática das suas finanças com orientações e diagnósticos reais'
    },
    {
      icon: 'upload_file',
      title: 'Importação Inteligente de Extratos',
      description: 'Leitura automática de PDF, OFX e CSV de qualquer banco com IA'
    },
    {
      icon: 'query_stats',
      title: 'Comparativo Mensal & Projeções',
      description: 'Gráficos comparativos de faturamento, margem e evolução entre meses'
    },
    {
      icon: 'payments',
      title: 'Retiradas de Pró-labore',
      description: 'Planeje sua remuneração de sócio sem descapitalizar seu caixa'
    },
    {
      icon: 'category',
      title: 'Categorias Ilimitadas',
      description: 'Crie e organize categorias com ícones e cores exclusivas'
    },
    {
      icon: 'cloud_done',
      title: 'Sincronização em Nuvem Criptografada',
      description: 'Seus dados salvos em tempo real com backup seguro permanente'
    },
    {
      icon: 'all_inclusive',
      title: 'Atualizações Perpétuas',
      description: 'Acesso permanente a todos os novos recursos lançados no MCO'
    }
  ];

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto pb-24 lg:pb-12 px-4 sm:px-0 text-left">
      {/* Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-extrabold tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full leading-none flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs">verified</span>
              Plano Vitalício Unificado
            </span>
            <span className="text-[10px] text-primary font-bold bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-full">
              Sem Mensalidades
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
            Plano Vitalício Meu Caixa Organizado
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant/80 font-normal leading-relaxed max-w-2xl">
            Todos os recursos do sistema unificados em um único plano vitalício por apenas <strong className="text-primary font-bold">R$ 49,90</strong>. Sem mensalidades, sem taxas adicionais e com acesso permanente a todas as ferramentas.
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

      {/* Main Lifetime Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass-card rounded-[32px] p-6 sm:p-9 border border-primary/30 relative overflow-hidden bg-gradient-to-br from-[#1b152d] via-[#140f24] to-[#0e0a1b] shadow-2xl flex flex-col gap-8"
      >
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/20 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />

        {/* Card Top Highlights */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 border-b border-white/5 pb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                MCO Vitalício Completo
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary/30 to-purple-500/30 text-white border border-primary/40">
                Acesso Total
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium">
              Gestão Financeira Empresarial e Pessoal para Autônomos, MEIs e Pequenas Empresas.
            </p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 bg-black/40 border border-white/10 rounded-2xl px-5 py-3">
            <div className="flex flex-col text-right">
              <span className="text-[11px] text-zinc-400 line-through">De R$ 197,00</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Pagamento Único</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                R$ 49,90
              </span>
            </div>
          </div>
        </div>

        {/* Status & CTA Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 relative z-10">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="material-symbols-outlined text-2xl font-bold">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-white">
                Seu Plano Vitalício está Ativo
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                Você tem acesso permanente e ilimitado a todos os módulos do sistema.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => onNavigateToTab('dashboard')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-primary to-[#8b6eff] hover:from-[#8b6eff] hover:to-[#a18cff] text-white transition-all shadow-[0_4px_16px_rgba(124,58,237,0.35)] cursor-pointer text-center flex items-center justify-center gap-2"
            >
              <span>Acessar Meu Painel</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              Tudo o que está incluído no seu plano vitalício (R$ 49,90)
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              100% Desbloqueado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-base">{feat.icon}</span>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-emerald-400 font-bold select-none">check_circle</span>
                    <h4 className="text-xs font-bold text-white truncate">{feat.title}</h4>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-normal leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust Signpost */}
        <div className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 text-center sm:text-left">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02]">
            <span className="material-symbols-outlined text-primary text-lg">lock</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white">Pagamento 100% Seguro</span>
              <span className="text-[10px] text-zinc-400">Pix ou Cartão de Crédito</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02]">
            <span className="material-symbols-outlined text-emerald-400 text-lg">event_busy</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white">Sem Mensalidades</span>
              <span className="text-[10px] text-zinc-400">Pague R$ 49,90 uma única vez</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02]">
            <span className="material-symbols-outlined text-amber-400 text-lg">update</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white">Atualizações Vitalícias</span>
              <span className="text-[10px] text-zinc-400">Novos recursos sem custo</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
