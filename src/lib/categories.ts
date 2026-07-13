import { UserProfile } from '../types';

export interface CustomCategory {
  id: string;
  name: string;
  type: 'entrada' | 'saida';
  icon: string; // Material Symbols Outlined name
  color: string; // hex or tailwind class name
  bgColor: string; // tailwind bg/border class
  description?: string;
  isCustom: boolean;
}

export const SYSTEM_CATEGORIES: CustomCategory[] = [
  // Receitas (Entradas)
  { id: 'sys_vendas', name: 'Vendas', type: 'entrada', icon: 'payments', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/20', isCustom: false },
  { id: 'sys_servicos', name: 'Prestação de Serviços', type: 'entrada', icon: 'business_center', color: 'text-sky-400', bgColor: 'bg-sky-400/10 border-sky-400/20', isCustom: false },
  { id: 'sys_comissao', name: 'Comissão', type: 'entrada', icon: 'percent', color: 'text-violet-400', bgColor: 'bg-violet-400/10 border-violet-400/20', isCustom: false },
  { id: 'sys_investimentos', name: 'Investimentos', type: 'entrada', icon: 'trending_up', color: 'text-amber-400', bgColor: 'bg-amber-400/10 border-amber-400/20', isCustom: false },
  { id: 'sys_outros_rec', name: 'Outros', type: 'entrada', icon: 'category', color: 'text-slate-400', bgColor: 'bg-slate-400/10 border-slate-400/20', isCustom: false },

  // Despesas (Saídas)
  { id: 'sys_alimentacao', name: 'Alimentação', type: 'saida', icon: 'restaurant', color: 'text-orange-400', bgColor: 'bg-orange-400/10 border-orange-400/20', isCustom: false },
  { id: 'sys_transporte', name: 'Transporte', type: 'saida', icon: 'directions_car', color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/20', isCustom: false },
  { id: 'sys_marketing', name: 'Marketing', type: 'saida', icon: 'campaign', color: 'text-pink-400', bgColor: 'bg-pink-400/10 border-pink-400/20', isCustom: false },
  { id: 'sys_trafego', name: 'Tráfego Pago', type: 'saida', icon: 'ads_click', color: 'text-purple-400', bgColor: 'bg-purple-400/10 border-purple-400/20', isCustom: false },
  { id: 'sys_streaming', name: 'Streaming', type: 'saida', icon: 'play_circle', color: 'text-indigo-400', bgColor: 'bg-indigo-400/10 border-indigo-400/20', isCustom: false },
  { id: 'sys_softwares', name: 'Softwares', type: 'saida', icon: 'computer', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10 border-cyan-400/20', isCustom: false },
  { id: 'sys_internet', name: 'Internet', type: 'saida', icon: 'wifi', color: 'text-teal-400', bgColor: 'bg-teal-400/10 border-teal-400/20', isCustom: false },
  { id: 'sys_energia', name: 'Energia', type: 'saida', icon: 'bolt', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/20', isCustom: false },
  { id: 'sys_agua', name: 'Água', type: 'saida', icon: 'water_drop', color: 'text-sky-300', bgColor: 'bg-sky-300/10 border-sky-300/20', isCustom: false },
  { id: 'sys_aluguel', name: 'Aluguel', type: 'saida', icon: 'home', color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/20', isCustom: false },
  { id: 'sys_funcionarios', name: 'Funcionários', type: 'saida', icon: 'groups', color: 'text-rose-400', bgColor: 'bg-rose-400/10 border-rose-400/20', isCustom: false },
  { id: 'sys_impostos', name: 'Impostos', type: 'saida', icon: 'receipt_long', color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/20', isCustom: false },
  { id: 'sys_educacao', name: 'Educação', type: 'saida', icon: 'school', color: 'text-lime-400', bgColor: 'bg-lime-400/10 border-lime-400/20', isCustom: false },
  { id: 'sys_saude', name: 'Saúde', type: 'saida', icon: 'medical_services', color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/20', isCustom: false },
  { id: 'sys_equipamentos', name: 'Equipamentos', type: 'saida', icon: 'devices', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-400/10 border-fuchsia-400/20', isCustom: false },
  { id: 'sys_manutencao', name: 'Manutenção', type: 'saida', icon: 'build', color: 'text-stone-400', bgColor: 'bg-stone-400/10 border-stone-400/20', isCustom: false },
  { id: 'sys_fornecedores', name: 'Fornecedores', type: 'saida', icon: 'storefront', color: 'text-amber-300', bgColor: 'bg-amber-300/10 border-amber-300/20', isCustom: false },
  { id: 'sys_outros_des', name: 'Outros', type: 'saida', icon: 'category', color: 'text-slate-400', bgColor: 'bg-slate-400/10 border-slate-400/20', isCustom: false }
];

export const PRESET_COLORS = [
  { name: 'Verde Esmeralda', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/20' },
  { name: 'Azul Claro', color: 'text-sky-400', bgColor: 'bg-sky-400/10 border-sky-400/20' },
  { name: 'Roxo Violeta', color: 'text-violet-400', bgColor: 'bg-violet-400/10 border-violet-400/20' },
  { name: 'Amarelo Ouro', color: 'text-amber-400', bgColor: 'bg-amber-400/10 border-amber-400/20' },
  { name: 'Vermelho Coral', color: 'text-rose-400', bgColor: 'bg-rose-400/10 border-rose-400/20' },
  { name: 'Laranja Vibrante', color: 'text-orange-400', bgColor: 'bg-orange-400/10 border-orange-400/20' },
  { name: 'Rosa Choque', color: 'text-pink-400', bgColor: 'bg-pink-400/10 border-pink-400/20' },
  { name: 'Ciano Soft', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10 border-cyan-400/20' }
];

export const PRESET_ICONS = [
  { icon: 'restaurant', name: 'Alimentação' },
  { icon: 'directions_car', name: 'Transporte' },
  { icon: 'campaign', name: 'Marketing' },
  { icon: 'ads_click', name: 'Tráfego Pago' },
  { icon: 'play_circle', name: 'Streaming' },
  { icon: 'computer', name: 'Softwares' },
  { icon: 'wifi', name: 'Internet' },
  { icon: 'bolt', name: 'Energia' },
  { icon: 'water_drop', name: 'Água' },
  { icon: 'home', name: 'Aluguel' },
  { icon: 'groups', name: 'Funcionários' },
  { icon: 'receipt_long', name: 'Impostos' },
  { icon: 'school', name: 'Educação' },
  { icon: 'medical_services', name: 'Saúde' },
  { icon: 'devices', name: 'Equipamentos' },
  { icon: 'build', name: 'Manutenção' },
  { icon: 'storefront', name: 'Fornecedores' },
  { icon: 'payments', name: 'Vendas' },
  { icon: 'business_center', name: 'Prestação de Serviços' },
  { icon: 'percent', name: 'Comissão' },
  { icon: 'trending_up', name: 'Investimentos' },
  { icon: 'category', name: 'Outros' }
];

// Get custom categories saved for a user
export function getCustomCategories(userId: string): CustomCategory[] {
  if (!userId) return [];
  const key = `mco_custom_categories_${userId}`;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading custom categories', e);
    return [];
  }
}

// Save custom categories for a user
export function saveCustomCategories(userId: string, categories: CustomCategory[]) {
  if (!userId) return;
  const key = `mco_custom_categories_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving custom categories', e);
  }
}

// Get combined categories
export function getCombinedCategories(userId: string): CustomCategory[] {
  const custom = getCustomCategories(userId);
  return [...SYSTEM_CATEGORIES, ...custom];
}

// Get names for selection dropdown based on type ('entrada' | 'saida')
export function getCategoryNamesByType(userId: string, type: 'entrada' | 'saida'): string[] {
  const combined = getCombinedCategories(userId);
  return combined
    .filter(cat => cat.type === type)
    .map(cat => cat.name);
}

// Get icon and color info for any category name (with fallback)
export function getCategoryInfo(name: string, type: 'entrada' | 'saida', userId: string): { icon: string; color: string; bgColor: string } {
  const combined = getCombinedCategories(userId);
  const found = combined.find(cat => cat.name.toLowerCase() === name.toLowerCase() && cat.type === type) 
              || combined.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  
  if (found) {
    return {
      icon: found.icon,
      color: found.color,
      bgColor: found.bgColor
    };
  }

  // Fallbacks
  if (type === 'entrada') {
    return {
      icon: 'payments',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10 border-emerald-400/20'
    };
  } else {
    return {
      icon: 'category',
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/10 border-slate-400/20'
    };
  }
}
