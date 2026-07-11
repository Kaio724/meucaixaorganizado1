export type PlanType = 'essential' | 'pro';

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
}

export type ActiveTab = 'dashboard' | 'historico' | 'retirar' | 'resumo' | 'planos';

