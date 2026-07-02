import { Transaction } from './types';

// Let's dynamically compute dates so they always align relative to current date (or June 2026 as per screenshot)
// Let's create static ones first but allow dynamic month resolution
const getTodayDateString = (daysOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    title: 'Venda de Doces',
    amount: 145.00,
    type: 'entrada',
    date: getTodayDateString(0), // Today
    paymentMethod: 'Pix',
    category: 'Cliente Avulso',
    description: 'Venda de doces sortidos para cliente direto'
  },
  {
    id: '2',
    title: 'Fornecedor Embalagens',
    amount: 19.90,
    type: 'saida',
    date: getTodayDateString(0), // Today
    paymentMethod: 'Cartão de Crédito',
    category: 'Materiais',
    description: 'Embalagens para os doces gourmet'
  },
  {
    id: '3',
    title: 'Encomenda Festa',
    amount: 250.00,
    type: 'entrada',
    date: getTodayDateString(1), // Yesterday
    paymentMethod: 'Dinheiro',
    category: 'Sinal',
    description: 'Adiantamento de 50% para buffet infantil'
  },
  {
    id: '4',
    title: 'Gasolina Entregas',
    amount: 65.00,
    type: 'saida',
    date: getTodayDateString(1), // Yesterday
    paymentMethod: 'Débito',
    category: 'Transporte',
    description: 'Abastecimento para entregas do final de semana'
  }
];

export const AVAILABLE_CATEGORIES = {
  entrada: ['Venda de produto', 'Prestação de serviço', 'Sinal', 'Encomenda', 'Investimento', 'Outros'],
  saida: ['Materiais', 'Transporte', 'Aluguel', 'Impostos', 'Marketing', 'Fornecedores', 'Outros']
};

export const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Débito', 'Transferência Bancária'];
