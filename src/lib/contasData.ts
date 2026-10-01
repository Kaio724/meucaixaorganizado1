import { ContaFinanceira, AccountType, Transaction } from '../types';

// Storage keys - strictly segregated by userId and accountType
const CONTAS_KEY = (userId: string, accountType: AccountType) =>
  `mco_contas_${userId || 'local'}_${accountType}`;

// Initial default accounts for NEGÓCIO (Empresarial) - Zeroed for user self-registration
export const DEFAULT_CONTAS_EMPRESARIAL: Omit<ContaFinanceira, 'id' | 'user_id' | 'accountType'>[] = [];

// Initial default accounts for PESSOAL - Zeroed for user self-registration
export const DEFAULT_CONTAS_PESSOAL: Omit<ContaFinanceira, 'id' | 'user_id' | 'accountType'>[] = [];

function generateContaId(): string {
  return 'cnt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Fetch accounts strictly for the specified environment (empresarial or pessoal)
 */
export async function fetchContas(
  userId: string,
  accountType: AccountType
): Promise<ContaFinanceira[]> {
  // One-time reset so existing client sessions have seed mock data cleared
  if (typeof window !== 'undefined' && localStorage.getItem('mco_contas_zeroed_v1') !== 'true') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('mco_contas_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('mco_contas_zeroed_v1', 'true');
    } catch (e) {
      console.warn('Error clearing seed contas:', e);
    }
  }

  const localKey = CONTAS_KEY(userId, accountType);
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed: ContaFinanceira[] = JSON.parse(raw);
      // Validate that all items belong to this accountType
      return parsed.filter((c) => c.accountType === accountType);
    }

    // First time initializing: starts 100% empty for client to register their own
    localStorage.setItem(localKey, JSON.stringify([]));
    return [];
  } catch (e) {
    console.warn('Error reading contas from localStorage:', e);
    return [];
  }
}

/**
 * Save (create or update) an account, enforcing accountType isolation
 */
export async function saveConta(
  userId: string,
  conta: Omit<ContaFinanceira, 'id'> & { id?: string }
): Promise<ContaFinanceira> {
  const accountType = conta.accountType;
  const localKey = CONTAS_KEY(userId, accountType);
  let list: ContaFinanceira[] = [];

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) list = JSON.parse(raw);
  } catch (e) {
    list = [];
  }

  let savedConta: ContaFinanceira;
  if (conta.id) {
    // Update existing
    savedConta = {
      ...conta,
      id: conta.id,
      user_id: userId,
      accountType
    } as ContaFinanceira;
    list = list.map((item) => (item.id === conta.id ? savedConta : item));
  } else {
    // Create new
    savedConta = {
      ...conta,
      id: generateContaId(),
      user_id: userId,
      accountType,
      created_at: new Date().toISOString()
    } as ContaFinanceira;
    list.unshift(savedConta);
  }

  try {
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving conta to localStorage:', e);
  }

  return savedConta;
}

/**
 * Delete an account
 */
export async function deleteConta(
  userId: string,
  id: string,
  accountType: AccountType
): Promise<boolean> {
  const localKey = CONTAS_KEY(userId, accountType);
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return true;
    let list: ContaFinanceira[] = JSON.parse(raw);
    list = list.filter((item) => item.id !== id);
    localStorage.setItem(localKey, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn('Error deleting conta:', e);
    return false;
  }
}

/**
 * Toggle active status
 */
export async function toggleContaAtiva(
  userId: string,
  id: string,
  accountType: AccountType
): Promise<ContaFinanceira | null> {
  const localKey = CONTAS_KEY(userId, accountType);
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return null;
    let list: ContaFinanceira[] = JSON.parse(raw);
    const target = list.find((item) => item.id === id);
    if (!target) return null;

    target.ativa = !target.ativa;
    localStorage.setItem(localKey, JSON.stringify(list));
    return target;
  } catch (e) {
    console.warn('Error toggling conta:', e);
    return null;
  }
}

/**
 * Mark that a fixed account was launched in the specified month (e.g. "2026-10")
 */
export async function marcarContaLancadaMes(
  userId: string,
  id: string,
  accountType: AccountType,
  mesAno: string
): Promise<void> {
  const localKey = CONTAS_KEY(userId, accountType);
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return;
    let list: ContaFinanceira[] = JSON.parse(raw);
    list = list.map((item) => {
      if (item.id === id) {
        return { ...item, ultimoLancamentoMes: mesAno };
      }
      return item;
    });
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.warn('Error updating ultimoLancamentoMes:', e);
  }
}

/**
 * Helper to check if a fixed account is already launched in a given month:
 * checks both the `ultimoLancamentoMes` flag and the actual transactions array for this account.
 */
export function isContaLancadaNoMes(
  conta: ContaFinanceira,
  mesAno: string, // "YYYY-MM"
  transactions: Transaction[]
): boolean {
  if (conta.ultimoLancamentoMes === mesAno) {
    return true;
  }

  // Check matching transaction by contaId or by matching title and category in that month
  const found = transactions.some((t) => {
    if (t.type !== 'saida') return false;
    if (t.accountType !== conta.accountType) return false;
    const txMesAno = t.date.substring(0, 7);
    if (txMesAno !== mesAno) return false;
    if (t.contaId === conta.id) return true;
    if (
      t.title.trim().toLowerCase() === conta.nome.trim().toLowerCase() &&
      t.category.trim().toLowerCase() === conta.categoria.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  return found;
}
