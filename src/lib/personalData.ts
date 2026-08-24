import { getSupabase } from './supabase';
import { 
  OrcamentoPessoal, 
  MetaPessoal, 
  ReservaMeta, 
  RecorrenciaPessoal,
  Transaction 
} from '../types';

// Storage keys
const ORCAMENTOS_KEY = (userId: string) => `mco_orcamentos_${userId}`;
const METAS_KEY = (userId: string) => `mco_metas_${userId}`;
const RESERVAS_KEY = (userId: string) => `mco_reservas_${userId}`;
const RECORRENCIAS_KEY = (userId: string) => `mco_recorrencias_${userId}`;

// Initial default seed data for personal features
const DEFAULT_METAS: Omit<MetaPessoal, 'id' | 'user_id'>[] = [
  {
    nome: 'Reserva de Emergência',
    valor_alvo: 5000,
    valor_atual: 1850,
    prazo: new Date(new Date().getFullYear(), new Date().getMonth() + 4, 15).toISOString().split('T')[0],
    icone: 'shield',
    cor: '#10B981',
    status: 'ativa'
  },
  {
    nome: 'Viagem de Férias',
    valor_alvo: 3500,
    valor_atual: 1200,
    prazo: new Date(new Date().getFullYear(), new Date().getMonth() + 6, 20).toISOString().split('T')[0],
    icone: 'plane',
    cor: '#7C3AED',
    status: 'ativa'
  }
];

const DEFAULT_ORCAMENTOS = (currentMonth: number, currentYear: number): Omit<OrcamentoPessoal, 'id' | 'user_id'>[] => [
  {
    categoria_nome: 'Alimentação',
    valor_limite: 1200,
    mes: currentMonth,
    ano: currentYear
  },
  {
    categoria_nome: 'Transporte',
    valor_limite: 450,
    mes: currentMonth,
    ano: currentYear
  },
  {
    categoria_nome: 'Lazer',
    valor_limite: 350,
    mes: currentMonth,
    ano: currentYear
  }
];

const DEFAULT_RECORRENCIAS: Omit<RecorrenciaPessoal, 'id' | 'user_id'>[] = [
  {
    tipo: 'saida',
    descricao: 'Netflix & Streaming',
    valor: 55.90,
    categoria: 'Assinaturas',
    frequencia: 'mensal',
    dia_cobranca: 10,
    forma_pagamento: 'Cartão de Crédito',
    proxima_data: new Date().toISOString().split('T')[0],
    ativo: true
  },
  {
    tipo: 'saida',
    descricao: 'Academia',
    valor: 119.00,
    categoria: 'Saúde',
    frequencia: 'mensal',
    dia_cobranca: 15,
    forma_pagamento: 'Pix',
    proxima_data: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ativo: true
  }
];

// Helper to generate UUID-like string
export function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// ----------------------------------------------------
// ORÇAMENTOS PESSOAIS
// ----------------------------------------------------

export async function fetchOrcamentos(userId: string, mes: number, ano: number): Promise<OrcamentoPessoal[]> {
  const localKey = ORCAMENTOS_KEY(userId);
  let localData: OrcamentoPessoal[] = [];

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      localData = JSON.parse(raw);
    } else {
      // Seed default
      localData = DEFAULT_ORCAMENTOS(mes, ano).map(o => ({
        ...o,
        id: generateId(),
        user_id: userId,
        created_at: new Date().toISOString()
      }));
      localStorage.setItem(localKey, JSON.stringify(localData));
    }
  } catch (e) {
    console.warn('Error reading orcamentos from localStorage', e);
  }

  const supabase = getSupabase();
  if (!supabase || userId === 'local') {
    return localData.filter(o => o.mes === mes && o.ano === ano);
  }

  try {
    const { data, error } = await supabase
      .from('orcamentos_pessoais')
      .select('*')
      .eq('user_id', userId)
      .eq('mes', mes)
      .eq('ano', ano);

    if (error) {
      // table might not exist yet in Supabase, return localData
      return localData.filter(o => o.mes === mes && o.ano === ano);
    }

    if (data && data.length > 0) {
      const mapped: OrcamentoPessoal[] = data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        categoria_pessoal_id: row.categoria_pessoal_id,
        categoria_nome: row.categoria_nome || row.categoria || 'Outros',
        valor_limite: Number(row.valor_limite) || 0,
        mes: Number(row.mes),
        ano: Number(row.ano),
        created_at: row.created_at
      }));
      return mapped;
    }
  } catch (e) {
    console.warn('Supabase fetchOrcamentos error:', e);
  }

  return localData.filter(o => o.mes === mes && o.ano === ano);
}

export async function saveOrcamento(userId: string, orcamento: Omit<OrcamentoPessoal, 'id'> & { id?: string }): Promise<OrcamentoPessoal> {
  const localKey = ORCAMENTOS_KEY(userId);
  let all: OrcamentoPessoal[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) all = JSON.parse(raw);
  } catch (e) {}

  const finalId = orcamento.id || generateId();
  const savedItem: OrcamentoPessoal = {
    ...orcamento,
    id: finalId,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  const existingIdx = all.findIndex(o => (o.id === finalId) || (o.categoria_nome === orcamento.categoria_nome && o.mes === orcamento.mes && o.ano === orcamento.ano));
  if (existingIdx >= 0) {
    all[existingIdx] = savedItem;
  } else {
    all.push(savedItem);
  }

  try {
    localStorage.setItem(localKey, JSON.stringify(all));
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('orcamentos_pessoais').upsert({
        id: finalId.startsWith('id_') ? undefined : finalId,
        user_id: userId,
        categoria_nome: orcamento.categoria_nome,
        valor_limite: orcamento.valor_limite,
        mes: orcamento.mes,
        ano: orcamento.ano
      });
    } catch (e) {
      console.warn('Supabase saveOrcamento error:', e);
    }
  }

  return savedItem;
}

export async function deleteOrcamento(userId: string, id: string): Promise<boolean> {
  const localKey = ORCAMENTOS_KEY(userId);
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const all: OrcamentoPessoal[] = JSON.parse(raw);
      const filtered = all.filter(o => o.id !== id);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('orcamentos_pessoais').delete().eq('id', id).eq('user_id', userId);
    } catch (e) {
      console.warn('Supabase deleteOrcamento error:', e);
    }
  }

  return true;
}

// ----------------------------------------------------
// METAS PESSOAIS & RESERVAS
// ----------------------------------------------------

export async function fetchMetas(userId: string): Promise<MetaPessoal[]> {
  const localKey = METAS_KEY(userId);
  let localData: MetaPessoal[] = [];

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      localData = JSON.parse(raw);
    } else {
      localData = DEFAULT_METAS.map(m => ({
        ...m,
        id: generateId(),
        user_id: userId,
        created_at: new Date().toISOString()
      }));
      localStorage.setItem(localKey, JSON.stringify(localData));
    }
  } catch (e) {
    console.warn('Error reading metas from localStorage', e);
  }

  const supabase = getSupabase();
  if (!supabase || userId === 'local') {
    return localData;
  }

  try {
    const { data, error } = await supabase
      .from('metas_pessoais')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped: MetaPessoal[] = data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        nome: row.nome,
        valor_alvo: Number(row.valor_alvo) || 0,
        valor_atual: Number(row.valor_atual) || 0,
        prazo: row.prazo || null,
        icone: row.icone || 'target',
        cor: row.cor || '#7C3AED',
        status: row.status || 'ativa',
        created_at: row.created_at
      }));
      return mapped;
    }
  } catch (e) {
    console.warn('Supabase fetchMetas error:', e);
  }

  return localData;
}

export async function saveMeta(userId: string, meta: Omit<MetaPessoal, 'id'> & { id?: string }): Promise<MetaPessoal> {
  const localKey = METAS_KEY(userId);
  let all: MetaPessoal[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) all = JSON.parse(raw);
  } catch (e) {}

  const finalId = meta.id || generateId();
  const savedItem: MetaPessoal = {
    ...meta,
    id: finalId,
    user_id: userId,
    valor_atual: meta.valor_atual || 0,
    status: meta.status || 'ativa',
    created_at: new Date().toISOString()
  };

  const existingIdx = all.findIndex(m => m.id === finalId);
  if (existingIdx >= 0) {
    all[existingIdx] = savedItem;
  } else {
    all.unshift(savedItem);
  }

  try {
    localStorage.setItem(localKey, JSON.stringify(all));
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('metas_pessoais').upsert({
        id: finalId.startsWith('id_') ? undefined : finalId,
        user_id: userId,
        nome: meta.nome,
        valor_alvo: meta.valor_alvo,
        valor_atual: meta.valor_atual,
        prazo: meta.prazo,
        icone: meta.icone,
        cor: meta.cor,
        status: meta.status
      });
    } catch (e) {
      console.warn('Supabase saveMeta error:', e);
    }
  }

  return savedItem;
}

export async function deleteMeta(userId: string, id: string): Promise<boolean> {
  const localKey = METAS_KEY(userId);
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const all: MetaPessoal[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(all.filter(m => m.id !== id)));
    }
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('metas_pessoais').delete().eq('id', id).eq('user_id', userId);
    } catch (e) {
      console.warn('Supabase deleteMeta error:', e);
    }
  }

  return true;
}

export async function fetchReservasByMeta(userId: string, metaId: string): Promise<ReservaMeta[]> {
  const localKey = RESERVAS_KEY(userId);
  let localData: ReservaMeta[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch (e) {}

  const supabase = getSupabase();
  if (!supabase || userId === 'local') {
    return localData.filter(r => r.meta_id === metaId);
  }

  try {
    const { data, error } = await supabase
      .from('reservas_metas')
      .select('*')
      .eq('user_id', userId)
      .eq('meta_id', metaId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        meta_id: row.meta_id,
        valor: Number(row.valor) || 0,
        descricao: row.descricao || '',
        data: row.data,
        created_at: row.created_at
      }));
    }
  } catch (e) {
    console.warn('Supabase fetchReservas error:', e);
  }

  return localData.filter(r => r.meta_id === metaId);
}

export async function addReservaMeta(
  userId: string, 
  reserva: Omit<ReservaMeta, 'id'>,
  meta: MetaPessoal
): Promise<{ reserva: ReservaMeta; updatedMeta: MetaPessoal }> {
  const localKey = RESERVAS_KEY(userId);
  let allReservas: ReservaMeta[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) allReservas = JSON.parse(raw);
  } catch (e) {}

  const newReserva: ReservaMeta = {
    ...reserva,
    id: generateId(),
    user_id: userId,
    created_at: new Date().toISOString()
  };
  allReservas.unshift(newReserva);
  try {
    localStorage.setItem(localKey, JSON.stringify(allReservas));
  } catch (e) {}

  // Recalculate meta total
  const metaReservas = allReservas.filter(r => r.meta_id === meta.id);
  const sum = metaReservas.reduce((acc, curr) => acc + curr.valor, 0);
  const newValorAtual = (meta.valor_atual || 0) + reserva.valor; // or sum

  const shouldComplete = newValorAtual >= meta.valor_alvo;
  const updatedMeta: MetaPessoal = {
    ...meta,
    valor_atual: newValorAtual,
    status: shouldComplete ? 'concluida' : meta.status
  };

  await saveMeta(userId, updatedMeta);

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('reservas_metas').insert({
        user_id: userId,
        meta_id: meta.id,
        valor: reserva.valor,
        descricao: reserva.descricao || null,
        data: reserva.data
      });
    } catch (e) {
      console.warn('Supabase addReservaMeta error:', e);
    }
  }

  return { reserva: newReserva, updatedMeta };
}

export async function deleteReservaMeta(
  userId: string, 
  reservaId: string, 
  meta: MetaPessoal
): Promise<MetaPessoal> {
  const localKey = RESERVAS_KEY(userId);
  let allReservas: ReservaMeta[] = [];
  let deletedVal = 0;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      allReservas = JSON.parse(raw);
      const found = allReservas.find(r => r.id === reservaId);
      if (found) deletedVal = found.valor;
      allReservas = allReservas.filter(r => r.id !== reservaId);
      localStorage.setItem(localKey, JSON.stringify(allReservas));
    }
  } catch (e) {}

  const newValorAtual = Math.max(0, (meta.valor_atual || 0) - deletedVal);
  const updatedMeta: MetaPessoal = {
    ...meta,
    valor_atual: newValorAtual,
    status: newValorAtual < meta.valor_alvo && meta.status === 'concluida' ? 'ativa' : meta.status
  };

  await saveMeta(userId, updatedMeta);

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('reservas_metas').delete().eq('id', reservaId).eq('user_id', userId);
    } catch (e) {
      console.warn('Supabase deleteReservaMeta error:', e);
    }
  }

  return updatedMeta;
}

// ----------------------------------------------------
// RECORRÊNCIAS PESSOAIS
// ----------------------------------------------------

export async function fetchRecorrencias(userId: string): Promise<RecorrenciaPessoal[]> {
  const localKey = RECORRENCIAS_KEY(userId);
  let localData: RecorrenciaPessoal[] = [];

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      localData = JSON.parse(raw);
    } else {
      localData = DEFAULT_RECORRENCIAS.map(r => ({
        ...r,
        id: generateId(),
        user_id: userId,
        created_at: new Date().toISOString()
      }));
      localStorage.setItem(localKey, JSON.stringify(localData));
    }
  } catch (e) {
    console.warn('Error reading recorrencias from localStorage', e);
  }

  const supabase = getSupabase();
  if (!supabase || userId === 'local') {
    return localData;
  }

  try {
    const { data, error } = await supabase
      .from('recorrencias_pessoais')
      .select('*')
      .eq('user_id', userId)
      .order('proxima_data', { ascending: true });

    if (!error && data && data.length > 0) {
      const mapped: RecorrenciaPessoal[] = data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        tipo: row.tipo,
        descricao: row.descricao,
        valor: Number(row.valor) || 0,
        categoria: row.categoria || 'Outros',
        frequencia: row.frequencia,
        dia_cobranca: row.dia_cobranca ? Number(row.dia_cobranca) : undefined,
        forma_pagamento: row.forma_pagamento || 'Pix',
        proxima_data: row.proxima_data,
        ativo: row.ativo !== false,
        created_at: row.created_at
      }));
      return mapped;
    }
  } catch (e) {
    console.warn('Supabase fetchRecorrencias error:', e);
  }

  return localData;
}

export async function saveRecorrencia(
  userId: string, 
  rec: Omit<RecorrenciaPessoal, 'id'> & { id?: string }
): Promise<RecorrenciaPessoal> {
  const localKey = RECORRENCIAS_KEY(userId);
  let all: RecorrenciaPessoal[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) all = JSON.parse(raw);
  } catch (e) {}

  const finalId = rec.id || generateId();
  const savedItem: RecorrenciaPessoal = {
    ...rec,
    id: finalId,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  const existingIdx = all.findIndex(r => r.id === finalId);
  if (existingIdx >= 0) {
    all[existingIdx] = savedItem;
  } else {
    all.push(savedItem);
  }

  try {
    localStorage.setItem(localKey, JSON.stringify(all));
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('recorrencias_pessoais').upsert({
        id: finalId.startsWith('id_') ? undefined : finalId,
        user_id: userId,
        tipo: rec.tipo,
        descricao: rec.descricao,
        valor: rec.valor,
        categoria: rec.categoria,
        frequencia: rec.frequencia,
        dia_cobranca: rec.dia_cobranca,
        forma_pagamento: rec.forma_pagamento,
        proxima_data: rec.proxima_data,
        ativo: rec.ativo
      });
    } catch (e) {
      console.warn('Supabase saveRecorrencia error:', e);
    }
  }

  return savedItem;
}

export async function deleteRecorrencia(userId: string, id: string): Promise<boolean> {
  const localKey = RECORRENCIAS_KEY(userId);
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const all: RecorrenciaPessoal[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(all.filter(r => r.id !== id)));
    }
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase && userId !== 'local') {
    try {
      await supabase.from('recorrencias_pessoais').delete().eq('id', id).eq('user_id', userId);
    } catch (e) {
      console.warn('Supabase deleteRecorrencia error:', e);
    }
  }

  return true;
}

// Calculate the next recurrence date
export function computeNextDate(currentDateStr: string, frequencia: 'semanal' | 'quinzenal' | 'mensal', diaCobranca?: number): string {
  const base = new Date(currentDateStr + 'T12:00:00');

  if (frequencia === 'semanal') {
    base.setDate(base.getDate() + 7);
  } else if (frequencia === 'quinzenal') {
    base.setDate(base.getDate() + 15);
  } else {
    // Mensal
    const targetDay = diaCobranca || base.getDate();
    let nextMonth = base.getMonth() + 1;
    let nextYear = base.getFullYear();
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    
    // Check days in next month
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const day = Math.min(targetDay, daysInNextMonth);
    const nextDate = new Date(nextYear, nextMonth, day, 12, 0, 0);
    return nextDate.toISOString().split('T')[0];
  }

  return base.toISOString().split('T')[0];
}
