import { createClient } from '@supabase/supabase-js';
import { UserProfile, Transaction } from '../types';

let supabaseClient: any = null;

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
  return {
    name: row.nome || '',
    businessName: row.nome_negocio || '',
    businessType: row.tipo_negocio === 'mei' ? 'cnpj' : 'autonomo',
    isOnboarded: true,
    plan: (row.plano as any) === 'pro' ? 'pro' : 'essential',
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
  };
}

// Map Transaction to db row
export function mapTransactionToDb(tx: any, userId: string) {
  return {
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

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Profile not found or error:', error.message);
    if (error.code === 'PGRST116' || error.message?.includes('JSON object requested, multiple (or no) rows returned')) {
      return null;
    }
    throw error;
  }

  return mapDbProfileToUserProfile(data);
}

export async function upsertProfile(userId: string, profile: UserProfile): Promise<boolean> {
  if (userId === 'local') {
    localStorage.setItem('mco_profile', JSON.stringify(profile));
    return true;
  }

  const supabase = getSupabase();
  if (!supabase) return false;

  const dbProfile = mapUserProfileToDbProfile(profile, userId);
  const { error } = await supabase
    .from('profiles')
    .upsert(dbProfile);

  if (error) {
    console.error('Error upserting profile:', error.message);
    
    // If the error is about 'plano' column not in schema cache or missing, retry without it
    const isPlanoError = error.message?.includes('plano') || 
                          error.message?.includes('schema cache') || 
                          error.message?.includes('column');
    if (isPlanoError) {
      console.warn('Retrying upsert without "plano" column...');
      const { plano, ...cleanDbProfile } = dbProfile;
      const { error: retryError } = await supabase
        .from('profiles')
        .upsert(cleanDbProfile);
        
      if (retryError) {
        console.error('Error upserting profile on retry:', retryError.message);
        throw retryError;
      }
      return true;
    }
    
    throw error;
  }

  return true;
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

  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error.message);
    throw error;
  }

  return (data || []).map(mapDbToTransaction);
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
  if (!supabase) throw new Error('Supabase client not initialized');

  const dbTx = mapTransactionToDb(tx, userId);
  const { data, error } = await supabase
    .from('lancamentos')
    .insert(dbTx)
    .select()
    .single();

  if (error) {
    console.error('Error inserting transaction:', error.message);
    throw error;
  }

  return mapDbToTransaction(data);
}

export async function updateTransaction(userId: string, tx: Transaction): Promise<Transaction> {
  if (userId === 'local') {
    const localTxsSaved = localStorage.getItem('mco_transactions');
    let list = localTxsSaved ? JSON.parse(localTxsSaved) : [];
    list = list.map((t: any) => (t.id === tx.id ? tx : t));
    localStorage.setItem('mco_transactions', JSON.stringify(list));
    return tx;
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const dbTx = mapTransactionToDb(tx, userId);
  const { data, error } = await supabase
    .from('lancamentos')
    .update(dbTx)
    .eq('id', tx.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error.message);
    throw error;
  }

  return mapDbToTransaction(data);
}

export async function deleteTransaction(userId: string, txId: string): Promise<boolean> {
  if (userId === 'local') {
    const localTxsSaved = localStorage.getItem('mco_transactions');
    let list = localTxsSaved ? JSON.parse(localTxsSaved) : [];
    list = list.filter((t: any) => t.id !== txId);
    localStorage.setItem('mco_transactions', JSON.stringify(list));
    return true;
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', txId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting transaction:', error.message);
    throw error;
  }

  return true;
}

