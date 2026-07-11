import { createClient } from '@supabase/supabase-js';
import { UserProfile, Transaction } from '../types';

let supabaseClient: any = null;
let hasPlanoColumn = typeof window !== 'undefined' && localStorage.getItem('mco_db_has_plano') !== 'false';
let hasContaColumn = typeof window !== 'undefined' && localStorage.getItem('mco_db_has_conta') !== 'false';

export function getSupabaseUrl() {
  return (import.meta as any).env.VITE_SUPABASE_URL || 'https://yfbgauajvijwngvhrkms.supabase.co';
}

export function getSupabaseAnonKey() {
  return (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYmdhdWFqdmlqd25ndmhya21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTUwNzUsImV4cCI6MjA5ODU5MTA3NX0.gmhQiDzKghNUWMhX5kh3WWrWvaAAX4Kdyi1RAAowzyM';
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return !!(url && key && url !== 'sua_url_aqui' && key !== 'sua_chave_aqui');
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

// Map db row to UserProfile
export function mapDbProfileToUserProfile(row: any): UserProfile {
  const userId = row?.id;
  let localPlan = 'essential';
  if (userId) {
    localPlan = localStorage.getItem(`mco_profile_plan_${userId}`) || 'essential';
  }
  return {
    name: row.nome || '',
    businessName: row.nome_negocio || '',
    businessType: row.tipo_negocio === 'mei' ? 'cnpj' : 'autonomo',
    isOnboarded: true,
    plan: (row.plano as any) === 'pro' ? 'pro' : (localPlan === 'pro' ? 'pro' : 'essential'),
  };
}

// Map UserProfile to db row
export function mapUserProfileToDbProfile(profile: UserProfile, userId: string) {
  return {
    id: userId,
    nome: profile.name,
    nome_negocio: profile.businessName,
    tipo_negocio: profile.businessType === 'cnpj' ? 'mei' : 'autonomo',
    plano: profile.plan || 'essential',
  };
}

// Map db row to Transaction
export function mapDbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    title: row.titulo || row.descricao || 'Lançamento',
    amount: Number(row.valor) || 0,
    type: row.tipo as 'entrada' | 'saida',
    date: row.data,
    paymentMethod: row.forma_pagamento || 'Pix',
    category: row.categoria || 'Outros',
    description: row.descricao || '',
    account: row.conta || undefined,
  };
}

// Map Transaction to db row
export function mapTransactionToDb(tx: any, userId: string) {
  const row: any = {
    id: tx.id || undefined,
    user_id: userId,
    tipo: tx.type,
    categoria: tx.category,
    valor: tx.amount,
    titulo: tx.title,
    forma_pagamento: tx.paymentMethod,
    descricao: tx.description || null,
    data: tx.date,
  };
  if (hasContaColumn && tx.account) {
    row.conta = tx.account;
  }
  return row;
}

// Database APIs
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (userId === 'local') {
    const savedProfile = localStorage.getItem('mco_profile');
    if (savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const columns = hasPlanoColumn ? '*' : 'id, nome, nome_negocio, tipo_negocio';
    const { data, error } = await supabase
      .from('profiles')
      .select(columns)
      .eq('id', userId)
      .single();

    if (error) {
      const isPlanoError = error.message?.includes('plano') || 
                            error.message?.includes('schema cache') || 
                            error.message?.includes('column');
      if (isPlanoError && hasPlanoColumn) {
        // Handle gracefully, let catch block manage retry
        throw error;
      }
      
      console.warn('Profile not found or error:', error.message);
      if (error.code === 'PGRST116' || error.message?.includes('JSON object requested, multiple (or no) rows returned')) {
        return null;
      }
      throw error;
    }

    const profile = mapDbProfileToUserProfile(data);
    if (profile) {
      // Cache it
      localStorage.setItem(`mco_cached_profile_${userId}`, JSON.stringify(profile));
      localStorage.setItem(`mco_profile_plan_${userId}`, profile.plan || 'essential');
    }
    return profile;
  } catch (err: any) {
    // If it's a schema error or column error, retry with only specific columns
    if (err.message?.includes('plano') || err.message?.includes('schema cache') || err.message?.includes('column')) {
      console.warn('Retrying profile fetch with specific columns...');
      if (hasPlanoColumn) {
        hasPlanoColumn = false;
        localStorage.setItem('mco_db_has_plano', 'false');
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, nome_negocio, tipo_negocio')
          .eq('id', userId)
          .single();
        if (!error && data) {
          const localPlan = localStorage.getItem(`mco_profile_plan_${userId}`) || 'essential';
          const profile: UserProfile = {
            name: data.nome || '',
            businessName: data.nome_negocio || '',
            businessType: data.tipo_negocio === 'mei' ? 'cnpj' : 'autonomo',
            isOnboarded: true,
            plan: localPlan === 'pro' ? 'pro' : 'essential',
          };
          localStorage.setItem(`mco_cached_profile_${userId}`, JSON.stringify(profile));
          return profile;
        }
      } catch (retryErr) {
        console.warn('Retry fetch failed:', retryErr);
      }
    } else {
      console.warn('Error in fetchProfile:', err);
    }

    // Try reading from cache fallback on any error (like TypeError: Failed to fetch)
    const cached = localStorage.getItem(`mco_cached_profile_${userId}`);
    if (cached) {
      try {
        console.log('Returning cached profile fallback...');
        return JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }

    // If we have a special case, we can return a basic profile if we're completely offline
    if (userId && userId !== 'local') {
      const isPro = localStorage.getItem(`mco_profile_plan_${userId}`) === 'pro';
      return {
        name: 'Usuário MCO',
        businessName: 'Meu Negócio',
        businessType: 'autonomo',
        isOnboarded: true,
        plan: isPro ? 'pro' : 'essential',
      };
    }

    throw err;
  }
}

export async function upsertProfile(userId: string, profile: UserProfile): Promise<boolean> {
  if (userId === 'local') {
    localStorage.setItem('mco_profile', JSON.stringify(profile));
    return true;
  }

  // Update plan in local storage cache
  localStorage.setItem(`mco_profile_plan_${userId}`, profile.plan || 'essential');
  localStorage.setItem(`mco_cached_profile_${userId}`, JSON.stringify(profile));

  const supabase = getSupabase();
  if (!supabase) return false;

  const dbProfile = mapUserProfileToDbProfile(profile, userId);
  let cleanDbProfile = { ...dbProfile };
  if (!hasPlanoColumn) {
    delete (cleanDbProfile as any).plano;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert(cleanDbProfile);

    if (error) {
      // If the error is about 'plano' column not in schema cache or missing, retry without it
      const isPlanoError = error.message?.includes('plano') || 
                            error.message?.includes('schema cache') || 
                            error.message?.includes('column');
      if (isPlanoError) {
        if (hasPlanoColumn) {
          console.warn('Database profiles table does not have "plano" column. Marking as unsupported.');
          hasPlanoColumn = false;
          localStorage.setItem('mco_db_has_plano', 'false');
        }
        
        const { plano, ...finalDbProfile } = cleanDbProfile;
        const { error: retryError } = await supabase
          .from('profiles')
          .upsert(finalDbProfile);
          
        if (retryError) {
          console.warn('Error upserting profile on retry:', retryError.message);
          return true;
        }
        return true;
      }
      
      console.warn('Error upserting profile:', error.message);
      return true;
    }
    return true;
  } catch (err) {
    console.warn('Catch error in upsertProfile:', err);
    // Silent success since we successfully cached it locally
    return true;
  }
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  if (userId === 'local') {
    const localTxsSaved = localStorage.getItem('mco_transactions');
    if (localTxsSaved) {
      try {
        return JSON.parse(localTxsSaved);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching transactions:', error.message);
      throw error;
    }

    const txs = (data || []).map(mapDbToTransaction);
    // Cache successfully loaded transactions
    localStorage.setItem(`mco_cached_transactions_${userId}`, JSON.stringify(txs));
    return txs;
  } catch (err: any) {
    console.warn('Error in fetchTransactions:', err);
    // Read from cache fallback on any error (like TypeError: Failed to fetch)
    const cached = localStorage.getItem(`mco_cached_transactions_${userId}`);
    if (cached) {
      try {
        console.log('Returning cached transactions fallback...');
        return JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }
    return []; // Return empty array instead of throwing to prevent crashing the app
  }
}

export async function insertTransaction(userId: string, tx: Omit<Transaction, 'id'> & { id?: string }): Promise<Transaction> {
  if (userId === 'local') {
    const localTxsSaved = localStorage.getItem('mco_transactions');
    const list = localTxsSaved ? JSON.parse(localTxsSaved) : [];
    const newTx: Transaction = {
      ...tx,
      id: tx.id || Math.random().toString(36).substring(2, 9),
    } as Transaction;
    list.unshift(newTx);
    localStorage.setItem('mco_transactions', JSON.stringify(list));
    return newTx;
  }

  const supabase = getSupabase();
  const fallbackTx: Transaction = {
    ...tx,
    id: tx.id || 'offline_' + Math.random().toString(36).substring(2, 9),
  } as Transaction;

  // Add to local cache first
  try {
    const cachedStr = localStorage.getItem(`mco_cached_transactions_${userId}`);
    const list = cachedStr ? JSON.parse(cachedStr) : [];
    list.unshift(fallbackTx);
    localStorage.setItem(`mco_cached_transactions_${userId}`, JSON.stringify(list));
  } catch (e) {
    console.warn('Error caching new transaction locally:', e);
  }

  if (!supabase) return fallbackTx;

  try {
    const dbTx = mapTransactionToDb(tx, userId);
    const { data, error } = await supabase
      .from('lancamentos')
      .insert(dbTx)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('conta') || error.message?.includes('column')) {
        console.warn('Database lancamentos table does not have "conta" column. Marking as unsupported.');
        hasContaColumn = false;
        if (typeof window !== 'undefined') {
          localStorage.setItem('mco_db_has_conta', 'false');
        }
        const retryDbTx = { ...dbTx };
        delete retryDbTx.conta;
        const { data: retryData, error: retryError } = await supabase
          .from('lancamentos')
          .insert(retryDbTx)
          .select()
          .single();
        if (retryError) {
          console.warn('Supabase retry insert failed, running with local fallback:', retryError.message);
          return fallbackTx;
        }
        return mapDbToTransaction(retryData);
      }
      console.warn('Supabase insert failed, running with local fallback:', error.message);
      return fallbackTx;
    }

    const insertedTx = mapDbToTransaction(data);
    // Replace fallback with real database transaction in local cache
    try {
      const cachedStr = localStorage.getItem(`mco_cached_transactions_${userId}`);
      let list = cachedStr ? JSON.parse(cachedStr) : [];
      list = list.map((t: any) => (t.id === fallbackTx.id ? insertedTx : t));
      localStorage.setItem(`mco_cached_transactions_${userId}`, JSON.stringify(list));
    } catch (e) {
      // ignore
    }

    return insertedTx;
  } catch (err) {
    console.warn('Network error during insert, running with local fallback:', err);
    return fallbackTx;
  }
}

export async function updateTransaction(userId: string, tx: Transaction): Promise<Transaction> {
  if (userId === 'local') {
    const localTxsSaved = localStorage.getItem('mco_transactions');
    let list = localTxsSaved ? JSON.parse(localTxsSaved) : [];
    list = list.map((t: any) => (t.id === tx.id ? tx : t));
    localStorage.setItem('mco_transactions', JSON.stringify(list));
    return tx;
  }

  // Update in local cache first
  try {
    const cachedStr = localStorage.getItem(`mco_cached_transactions_${userId}`);
    if (cachedStr) {
      let list = JSON.parse(cachedStr);
      list = list.map((t: any) => (t.id === tx.id ? tx : t));
      localStorage.setItem(`mco_cached_transactions_${userId}`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error caching transaction update:', e);
  }

  const supabase = getSupabase();
  if (!supabase) return tx;

  try {
    const dbTx = mapTransactionToDb(tx, userId);
    const { data, error } = await supabase
      .from('lancamentos')
      .update(dbTx)
      .eq('id', tx.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('conta') || error.message?.includes('column')) {
        console.warn('Database lancamentos table does not have "conta" column on update. Marking as unsupported.');
        hasContaColumn = false;
        if (typeof window !== 'undefined') {
          localStorage.setItem('mco_db_has_conta', 'false');
        }
        const retryDbTx = { ...dbTx };
        delete retryDbTx.conta;
        const { data: retryData, error: retryError } = await supabase
          .from('lancamentos')
          .update(retryDbTx)
          .eq('id', tx.id)
          .eq('user_id', userId)
          .select()
          .single();
        if (retryError) {
          console.warn('Supabase retry update failed, running with local fallback:', retryError.message);
          return tx;
        }
        return mapDbToTransaction(retryData);
      }
      console.warn('Supabase update failed, running with local fallback:', error.message);
      return tx;
    }

    return mapDbToTransaction(data);
  } catch (err) {
    console.warn('Network error during update, running with local fallback:', err);
    return tx;
  }
}

export async function deleteTransaction(userId: string, txId: string): Promise<boolean> {
  if (userId === 'local') {
    const localTxsSaved = localStorage.getItem('mco_transactions');
    let list = localTxsSaved ? JSON.parse(localTxsSaved) : [];
    list = list.filter((t: any) => t.id !== txId);
    localStorage.setItem('mco_transactions', JSON.stringify(list));
    return true;
  }

  // Remove from local cache first
  try {
    const cachedStr = localStorage.getItem(`mco_cached_transactions_${userId}`);
    if (cachedStr) {
      let list = JSON.parse(cachedStr);
      list = list.filter((t: any) => t.id !== txId);
      localStorage.setItem(`mco_cached_transactions_${userId}`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error caching transaction deletion:', e);
  }

  const supabase = getSupabase();
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('lancamentos')
      .delete()
      .eq('id', txId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase delete failed, running with local fallback:', error.message);
      return true;
    }

    return true;
  } catch (err) {
    console.warn('Network error during delete, running with local fallback:', err);
    return true;
  }
}

