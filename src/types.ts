export type PlanType = 'essential' | 'pro';
export type AccountType = 'empresarial' | 'pessoal';

export interface UserProfile {
  name: string;
  businessName: string;
  businessType: 'cnpj' | 'autonomo';
  isOnboarded: boolean;
  plan?: PlanType; // 'essential' | 'pro'
}

export type TransactionType = 'entrada' | 'saida';

export interface Transaction {
  id: string;
  title: string;
  amount: number; // positive value in both types, we rely on type or negative math
  type: TransactionType;
  date: string; // YYYY-MM-DD
  paymentMethod: string; // e.g. 'Pix', 'Dinheiro', 'Cartão de Crédito', 'Débito', etc.
  category: string; // e.g. 'Cliente Avulso', 'Sinal', 'Materiais', 'Transporte', 'Aluguel', 'Impostos', 'Outros'
  description?: string;
  account?: string; // Account origin/destination (Dinheiro, Conta Corrente, Poupança, Cartão de Crédito, Outro)
  accountType?: AccountType; // 'empresarial' | 'pessoal' (default: 'empresarial')
}

export type ActiveTab = 'dashboard' | 'historico' | 'retirar' | 'resumo' | 'planos' | 'categorias' | 'metas' | 'orcamentos' | 'recorrencias';

export interface OrcamentoPessoal {
  id: string;
  user_id?: string;
  categoria_pessoal_id?: string;
  categoria_nome: string;
  valor_limite: number;
  mes: number; // 1 to 12
  ano: number;
  created_at?: string;
}

export interface MetaPessoal {
  id: string;
  user_id?: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  prazo?: string | null; // YYYY-MM-DD
  icone?: string; // Lucide icon name
  cor?: string; // Hex color code
  status: 'ativa' | 'concluida' | 'cancelada';
  created_at?: string;
}

export interface ReservaMeta {
  id: string;
  user_id?: string;
  meta_id: string;
  valor: number;
  descricao?: string;
  data: string; // YYYY-MM-DD
  created_at?: string;
}

export interface RecorrenciaPessoal {
  id: string;
  user_id?: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  categoria_pessoal_id?: string;
  categoria: string;
  frequencia: 'semanal' | 'quinzenal' | 'mensal';
  dia_cobranca?: number; // 1-31 or 0-6
  forma_pagamento?: string;
  proxima_data: string; // YYYY-MM-DD
  ativo: boolean;
  created_at?: string;
}


