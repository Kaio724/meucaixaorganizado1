import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Receipt, 
  Repeat, 
  Wallet, 
  PieChart, 
  FolderTree, 
  Sparkles, 
  X, 
  ChevronRight,
  ShieldCheck,
  CalendarCheck
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';

interface EmpresarialMoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  profile?: UserProfile | null;
}

export default function EmpresarialMoreMenuModal({
  isOpen,
  onClose,
  onSelectTab,
  profile
}: EmpresarialMoreMenuModalProps) {
  if (!isOpen) return null;

  const isPro = (profile?.plan || 'essential') === 'pro';

  const menuItems = [
    {
      id: 'contas_pagar_receber' as ActiveTab,
      label: 'A Pagar e a Receber',
      description: 'Gestão de vencimentos, pendências e baixa de lançamentos',
      icon: CalendarCheck,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15 border-amber-500/30'
    },
    {
      id: 'contas' as ActiveTab,
      label: 'Contas Fixas & Variáveis',
      description: 'Estrutura de custos operacionais e previsibilidade',
      icon: Repeat,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15 border-purple-500/30'
    },
    {
      id: 'retirar' as ActiveTab,
      label: 'Retirar e Pró-labore',
      description: 'Planejamento de retiradas e remuneração de sócios',
      icon: Wallet,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15 border-emerald-500/30'
    },
    {
      id: 'resumo' as ActiveTab,
      label: 'Resumo Financeiro',
      description: 'Demonstrativo do resultado, gráficos e fechamento do mês',
      icon: PieChart,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'categorias' as ActiveTab,
      label: 'Minhas Categorias',
      description: 'Gerenciamento de categorias de receitas e despesas',
      icon: FolderTree,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/15 border-teal-500/30'
    },
    {
      id: 'planos' as ActiveTab,
      label: isPro ? 'Seu Plano: MCO PRO' : 'Upgrade de Plano',
      description: isPro ? 'Todos os recursos PRO ativados' : 'Desbloqueie conta dupla, IA ilimitada e automações',
      icon: Sparkles,
      color: 'text-primary',
      bgColor: 'bg-primary/20 border-primary/35',
      badge: isPro ? 'ATIVO' : 'PRO'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-md p-0 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#151122] border-t border-primary/30 rounded-t-[32px] overflow-hidden shadow-2xl flex flex-col pb-8 pt-3 text-left max-h-[85vh]"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

          {/* Header */}
          <div className="px-6 py-2 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                Mais Opções • Empresa
              </span>
              <h3 className="text-lg font-black text-white">Menu Completo</h3>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Items List */}
          <div className="p-4 overflow-y-auto flex flex-col gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${item.bgColor} ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white group-hover:text-primary transition-colors truncate">
                          {item.label}
                        </h4>
                        {item.badge && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
