import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  PiggyBank, 
  Repeat, 
  FolderTree, 
  User, 
  X, 
  ChevronRight, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface PersonalMoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenProfile: () => void;
}

export default function PersonalMoreMenuModal({
  isOpen,
  onClose,
  onSelectTab,
  onOpenProfile
}: PersonalMoreMenuModalProps) {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'resumo' as ActiveTab,
      label: 'Resumo Mensal',
      description: 'Análise de gastos, taxas de poupança e top categorias',
      icon: PieChart,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'orcamentos' as ActiveTab,
      label: 'Orçamentos',
      description: 'Limites de gastos mensais por categoria',
      icon: PiggyBank,
      color: 'text-[#c4b5fd]',
      bgColor: 'bg-[#7C3AED]/20 border-[#7C3AED]/35'
    },
    {
      id: 'recorrencias' as ActiveTab,
      label: 'Recorrências',
      description: 'Assinaturas e despesas fixas automatizadas',
      icon: Repeat,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15 border-amber-500/30'
    },
    {
      id: 'categorias' as ActiveTab,
      label: 'Categorias',
      description: 'Personalize suas categorias de receitas e despesas',
      icon: FolderTree,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15 border-emerald-500/30'
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
          className="w-full max-w-lg bg-[#161224] border-t border-primary/30 rounded-t-[32px] overflow-hidden shadow-2xl flex flex-col pb-8 pt-3 text-left"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

          {/* Header */}
          <div className="px-6 py-2 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c4b5fd]">
                Conta Pessoal
              </span>
              <h3 className="text-lg font-black text-white">Menu Completo</h3>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Items List */}
          <div className="p-4 flex flex-col gap-2">
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
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${item.bgColor} ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-[#c4b5fd] transition-colors">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              );
            })}

            {/* Profile Settings */}
            <button
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all text-left group cursor-pointer mt-1"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 bg-zinc-800/80 border-white/10 text-zinc-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-[#c4b5fd] transition-colors">
                    Meu Perfil & Senha
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Alterar nome e configurações de acesso
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
