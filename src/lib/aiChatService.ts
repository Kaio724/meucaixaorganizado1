import { AiConversation, AiChatMessage, AccountType, Transaction } from '../types';
import { getSupabase } from './supabase';

const LOCAL_STORAGE_PREFIX = 'mco_ai_conversas_';

/**
 * Sends a message to the backend Gemini AI reports endpoint.
 */
export async function sendAiChatMessage(params: {
  message: string;
  conversationId?: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  accountType: AccountType;
  transactions: Transaction[];
  authToken?: string;
  userId?: string;
  activeMonthYear?: { year: number; month: number };
}): Promise<{ reply: string; title?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (params.authToken) {
    headers['Authorization'] = `Bearer ${params.authToken}`;
  }

  const response = await fetch('/api/ai-reports/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: params.message,
      conversationId: params.conversationId,
      history: params.history,
      accountType: params.accountType,
      transactions: params.transactions,
      userId: params.userId,
      activeMonthYear: params.activeMonthYear,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao comunicar com o assistente financeiro do Gemini.');
  }

  return {
    reply: data.reply,
    title: data.title,
  };
}

/**
 * Loads conversations for a user and accountType (Empresarial vs Pessoal).
 * Tries Supabase first; if table missing or offline, uses localStorage fallback.
 */
export async function fetchAiConversations(
  userId: string,
  accountType: AccountType
): Promise<AiConversation[]> {
  const cacheKey = `${LOCAL_STORAGE_PREFIX}${userId}_${accountType}`;
  const localSaved = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  const localList: AiConversation[] = localSaved ? JSON.parse(localSaved) : [];

  if (userId === 'local') {
    return localList;
  }

  const supabase = getSupabase();
  if (!supabase) return localList;

  try {
    const { data, error } = await supabase
      .from('conversas_ia')
      .select('*')
      .eq('user_id', userId)
      .eq('tipo_conta', accountType)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar conversas do Supabase, usando cache local:', error.message);
      return localList;
    }

    const cloudConversations: AiConversation[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      accountType: row.tipo_conta as AccountType,
      title: row.titulo || 'Conversa sem título',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: Array.isArray(row.mensagens) ? row.mensagens : [],
    }));

    // Cache locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(cloudConversations));
    }

    return cloudConversations;
  } catch (err) {
    console.warn('Exceção ao buscar conversas_ia:', err);
    return localList;
  }
}

/**
 * Saves or updates a conversation in Supabase and local cache.
 */
export async function saveAiConversation(conversation: AiConversation): Promise<void> {
  const cacheKey = `${LOCAL_STORAGE_PREFIX}${conversation.userId}_${conversation.accountType}`;

  // Always update local cache first
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(cacheKey);
      let list: AiConversation[] = saved ? JSON.parse(saved) : [];
      const index = list.findIndex(c => c.id === conversation.id);
      if (index >= 0) {
        list[index] = conversation;
      } else {
        list.unshift(conversation);
      }
      localStorage.setItem(cacheKey, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Erro ao atualizar cache local de conversas:', e);
  }

  if (conversation.userId === 'local') {
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const row = {
      id: conversation.id,
      user_id: conversation.userId,
      tipo_conta: conversation.accountType,
      titulo: conversation.title,
      mensagens: conversation.messages,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('conversas_ia')
      .upsert(row);

    if (error) {
      console.warn('Aviso: Tabela conversas_ia não disponível no Supabase ou erro de RLS:', error.message);
    }
  } catch (err) {
    console.warn('Exceção ao persistir conversa no Supabase:', err);
  }
}

/**
 * Deletes a conversation from Supabase and local cache.
 */
export async function deleteAiConversation(
  conversationId: string,
  userId: string,
  accountType: AccountType
): Promise<void> {
  const cacheKey = `${LOCAL_STORAGE_PREFIX}${userId}_${accountType}`;

  // Update local cache
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        let list: AiConversation[] = JSON.parse(saved);
        list = list.filter(c => c.id !== conversationId);
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
    }
  } catch (e) {
    console.warn('Erro ao deletar conversa localmente:', e);
  }

  if (userId === 'local') return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase
      .from('conversas_ia')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('Exceção ao deletar conversa do Supabase:', err);
  }
}
