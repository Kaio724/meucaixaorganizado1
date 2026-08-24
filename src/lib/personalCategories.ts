export interface PersonalCategory {
  id: string;
  name: string;
  type: 'entrada' | 'saida';
  icon: string;
  color: string;
  bgColor: string;
  isCustom?: boolean;
}

export const PERSONAL_SYSTEM_CATEGORIES: PersonalCategory[] = [
  // Entradas Pessoais
  {
    id: 'pers_salario',
    name: 'Salário',
    type: 'entrada',
    icon: 'payments',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/20',
    isCustom: false
  },
  {
    id: 'pers_freelance',
    name: 'Freelance',
    type: 'entrada',
    icon: 'laptop_mac',
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10 border-sky-400/20',
    isCustom: false
  },
  {
    id: 'pers_prolabore',
    name: 'Pró-labore recebido',
    type: 'entrada',
    icon: 'account_balance_wallet',
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10 border-violet-400/20',
    isCustom: false
  },
  {
    id: 'pers_outros_rec',
    name: 'Outros',
    type: 'entrada',
    icon: 'category',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10 border-slate-400/20',
    isCustom: false
  },

  // Saídas Pessoais
  {
    id: 'pers_alimentacao',
    name: 'Alimentação',
    type: 'saida',
    icon: 'restaurant',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10 border-orange-400/20',
    isCustom: false
  },
  {
    id: 'pers_moradia',
    name: 'Moradia',
    type: 'saida',
    icon: 'home',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
    isCustom: false
  },
  {
    id: 'pers_transporte',
    name: 'Transporte',
    type: 'saida',
    icon: 'directions_car',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    isCustom: false
  },
  {
    id: 'pers_saude',
    name: 'Saúde',
    type: 'saida',
    icon: 'medical_services',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/20',
    isCustom: false
  },
  {
    id: 'pers_lazer',
    name: 'Lazer',
    type: 'saida',
    icon: 'celebration',
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10 border-pink-400/20',
    isCustom: false
  },
  {
    id: 'pers_educacao',
    name: 'Educação',
    type: 'saida',
    icon: 'school',
    color: 'text-lime-400',
    bgColor: 'bg-lime-400/10 border-lime-400/20',
    isCustom: false
  },
  {
    id: 'pers_assinaturas',
    name: 'Assinaturas',
    type: 'saida',
    icon: 'subscriptions',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10 border-purple-400/20',
    isCustom: false
  },
  {
    id: 'pers_outros_desp',
    name: 'Outros',
    type: 'saida',
    icon: 'category',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10 border-slate-400/20',
    isCustom: false
  }
];

// Get custom personal categories
export function getCustomPersonalCategories(userId: string): PersonalCategory[] {
  if (!userId) return [];
  const key = `mco_custom_personal_categories_${userId}`;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading custom personal categories', e);
    return [];
  }
}

// Save custom personal categories
export function saveCustomPersonalCategories(userId: string, categories: PersonalCategory[]) {
  if (!userId) return;
  const key = `mco_custom_personal_categories_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving custom personal categories', e);
  }
}

// Get combined personal categories
export function getCombinedPersonalCategories(userId: string): PersonalCategory[] {
  const custom = getCustomPersonalCategories(userId);
  return [...PERSONAL_SYSTEM_CATEGORIES, ...custom];
}

// Get category names for personal selection
export function getPersonalCategoryNamesByType(userId: string, type: 'entrada' | 'saida'): string[] {
  const combined = getCombinedPersonalCategories(userId);
  return combined
    .filter(cat => cat.type === type)
    .map(cat => cat.name);
}

// Get category icon and styling info
export function getPersonalCategoryInfo(name: string, type: 'entrada' | 'saida', userId: string = 'default_user'): { icon: string; color: string; bgColor: string } {
  const combined = getCombinedPersonalCategories(userId);
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
