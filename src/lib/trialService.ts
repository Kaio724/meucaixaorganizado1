import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { TrialRecord, TrialAuditLog, TrialStatusResponse } from '../types';

// Admin emails authorized to manage trials in MCO
export const ADMIN_EMAILS = [
  'kaiopatrick42@gmail.com',
  'kaioparick42@gmail.com'
];

/**
 * Check if a given email belongs to an authorized MCO administrator
 */
export function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(cleanEmail)) return true;
  if (process.env.ADMIN_EMAIL && cleanEmail === process.env.ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

// Local cache file path to guarantee persistence even if Supabase table is not yet migrated
const CACHE_FILE = path.join(process.cwd(), '.trials_cache.json');

interface TrialCacheStore {
  trials: Record<string, TrialRecord>; // key: lowercase email
  auditLogs: TrialAuditLog[];
}

function loadCache(): TrialCacheStore {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        trials: parsed.trials || {},
        auditLogs: parsed.auditLogs || []
      };
    }
  } catch (err) {
    console.warn('[TrialService] Falha ao ler cache local de testes:', err);
  }
  return { trials: {}, auditLogs: [] };
}

function saveCache(store: TrialCacheStore) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[TrialService] Falha ao salvar cache local de testes:', err);
  }
}

// In-memory memory store initialized from cache
let memoryStore: TrialCacheStore = loadCache();

// Supabase client helper for trials
function getSupabaseServerClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yfbgauajvijwngvhrkms.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYmdhdWFqdmlqd25ndmhya21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTUwNzUsImV4cCI6MjA5ODU5MTA3NX0.gmhQiDzKghNUWMhX5kh3WWrWvaAAX4Kdyi1RAAowzyM';
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * Log administrative audit action
 */
export async function logTrialAudit(
  adminId: string,
  adminEmail: string | undefined,
  targetEmail: string,
  action: 'grant' | 'extend' | 'cancel' | 'check_status',
  details: any = {},
  trialId?: string
): Promise<TrialAuditLog> {
  const auditLog: TrialAuditLog = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    trial_id: trialId,
    admin_id: adminId,
    admin_email: adminEmail,
    target_email: targetEmail.toLowerCase().trim(),
    action,
    details,
    created_at: new Date().toISOString()
  };

  // 1. Save in memory/file store
  memoryStore.auditLogs.push(auditLog);
  saveCache(memoryStore);

  // 2. Best-effort save to Supabase
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from('testes_auditoria').insert([{
      trial_id: trialId,
      admin_id: adminId,
      admin_email: adminEmail,
      target_email: targetEmail.toLowerCase().trim(),
      action,
      details,
      created_at: auditLog.created_at
    }]);
  } catch (err) {
    // Non-fatal, local cache already saved
  }

  return auditLog;
}

/**
 * Persist trial record in memory, file cache and Supabase
 */
async function persistTrialRecord(trial: TrialRecord): Promise<void> {
  const key = trial.email.toLowerCase().trim();
  memoryStore.trials[key] = trial;
  saveCache(memoryStore);

  try {
    const supabase = getSupabaseServerClient();
    // Try upserting to Supabase table
    const { error } = await supabase.from('testes_temporarios').upsert({
      id: trial.id,
      user_id: trial.user_id,
      email: trial.email.toLowerCase().trim(),
      admin_id: trial.admin_id,
      admin_email: trial.admin_email,
      duration_minutes: trial.duration_minutes,
      released_at: trial.released_at,
      started_at: trial.started_at,
      expires_at: trial.expires_at,
      status: trial.status,
      extensions_count: trial.extensions_count,
      notes: trial.notes,
      updated_at: trial.updated_at
    }, { onConflict: 'email' });

    if (error) {
      console.warn('[TrialService] Aviso ao persistir no Supabase (usando cache resiliente):', error.message);
    }
  } catch (err: any) {
    console.warn('[TrialService] Erro ao sincronizar com Supabase:', err?.message);
  }
}

/**
 * Get trial record by email
 */
export async function getTrialByEmail(email: string): Promise<TrialRecord | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return null;

  // 1. Try Supabase
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('testes_temporarios')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!error && data) {
      const trial: TrialRecord = {
        id: data.id,
        user_id: data.user_id,
        email: data.email,
        admin_id: data.admin_id,
        admin_email: data.admin_email,
        duration_minutes: data.duration_minutes,
        released_at: data.released_at,
        started_at: data.started_at,
        expires_at: data.expires_at,
        status: data.status,
        extensions_count: data.extensions_count || 0,
        notes: data.notes,
        updated_at: data.updated_at
      };
      // Keep memory store updated
      memoryStore.trials[cleanEmail] = trial;
      return trial;
    }
  } catch (e) {
    // fallback to memoryStore
  }

  // 2. Memory / file cache fallback
  if (!memoryStore.trials[cleanEmail]) {
    const fileCache = loadCache();
    if (fileCache.trials[cleanEmail]) {
      memoryStore.trials[cleanEmail] = fileCache.trials[cleanEmail];
    }
  }
  return memoryStore.trials[cleanEmail] || null;
}

/**
 * Grant a new temporary trial to a user account
 */
export async function grantTrial(
  adminId: string,
  adminEmail: string | undefined,
  targetEmail: string,
  durationMinutes: number,
  notes?: string
): Promise<{ success: boolean; message: string; trial?: TrialRecord }> {
  const cleanEmail = targetEmail.toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'E-mail inválido informado.' };
  }

  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return { success: false, message: 'Duração em minutos inválida.' };
  }

  const existingTrial = await getTrialByEmail(cleanEmail);

  // If there is already an active trial that hasn't expired yet
  if (existingTrial && existingTrial.status === 'active') {
    const expiresAt = existingTrial.expires_at ? new Date(existingTrial.expires_at).getTime() : 0;
    if (Date.now() < expiresAt) {
      const remainingMinutes = Math.ceil((expiresAt - Date.now()) / 60000);
      return {
        success: false,
        message: `O usuário ${cleanEmail} já possui um teste ativo em andamento com ${remainingMinutes} minuto(s) restante(s). Se desejar, use o comando de estender o teste.`
      };
    }
  }

  const now = new Date().toISOString();
  const trialId = existingTrial ? existingTrial.id : 'trial_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const newTrial: TrialRecord = {
    id: trialId,
    user_id: existingTrial?.user_id || null,
    email: cleanEmail,
    admin_id: adminId,
    admin_email: adminEmail,
    duration_minutes: durationMinutes,
    released_at: now,
    started_at: null, // ONLY starts on user's first login/access!
    expires_at: null,
    status: 'pending', // Pending first access
    extensions_count: 0,
    notes: notes || 'Liberado pelo chat da IA',
    updated_at: now
  };

  await persistTrialRecord(newTrial);
  await logTrialAudit(adminId, adminEmail, cleanEmail, 'grant', { durationMinutes, notes }, trialId);

  const formattedDuration = durationMinutes >= 60 
    ? `${durationMinutes / 60} hora(s)` 
    : `${durationMinutes} minutos`;

  return {
    success: true,
    message: `Teste de ${formattedDuration} liberado com sucesso para ${cleanEmail}. O período começará quando o usuário acessar o MCO pela primeira vez após a liberação.`,
    trial: newTrial
  };
}

/**
 * Extend an existing trial duration
 */
export async function extendTrial(
  adminId: string,
  adminEmail: string | undefined,
  targetEmail: string,
  additionalMinutes: number,
  notes?: string
): Promise<{ success: boolean; message: string; trial?: TrialRecord }> {
  const cleanEmail = targetEmail.toLowerCase().trim();
  const trial = await getTrialByEmail(cleanEmail);

  if (!trial) {
    return {
      success: false,
      message: `Não foi encontrado nenhum registro de teste para ${cleanEmail}. Deseja liberar um novo teste?`
    };
  }

  if (trial.status === 'cancelled') {
    return {
      success: false,
      message: `O teste de ${cleanEmail} foi cancelado anteriormente. Para reativar, libere um novo teste.`
    };
  }

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  trial.extensions_count = (trial.extensions_count || 0) + 1;
  trial.duration_minutes = (trial.duration_minutes || 0) + additionalMinutes;
  trial.updated_at = nowIso;
  if (notes) trial.notes = notes;

  if (trial.status === 'pending') {
    // Just increase total authorized duration
    await persistTrialRecord(trial);
    await logTrialAudit(adminId, adminEmail, cleanEmail, 'extend', { additionalMinutes, newDuration: trial.duration_minutes }, trial.id);
    return {
      success: true,
      message: `Teste de ${cleanEmail} estendido com sucesso em +${additionalMinutes} minutos (Total autorizado: ${trial.duration_minutes} min). O período ainda está pendente do primeiro acesso.`,
      trial
    };
  }

  if (trial.status === 'active') {
    // Current active test: add additional minutes to expires_at
    const currentExpiresMs = trial.expires_at ? new Date(trial.expires_at).getTime() : nowMs;
    const baseMs = Math.max(nowMs, currentExpiresMs);
    const newExpiresMs = baseMs + additionalMinutes * 60000;
    trial.expires_at = new Date(newExpiresMs).toISOString();
    
    await persistTrialRecord(trial);
    await logTrialAudit(adminId, adminEmail, cleanEmail, 'extend', { additionalMinutes, newExpiresAt: trial.expires_at }, trial.id);

    const remainingMinutes = Math.ceil((newExpiresMs - nowMs) / 60000);
    return {
      success: true,
      message: `Teste de ${cleanEmail} estendido por mais ${additionalMinutes} minutos com sucesso! Novo tempo restante: ${remainingMinutes} minuto(s).`,
      trial
    };
  }

  if (trial.status === 'expired') {
    // Test had expired: reactivate from now for additionalMinutes
    trial.status = 'active';
    trial.started_at = nowIso;
    trial.expires_at = new Date(nowMs + additionalMinutes * 60000).toISOString();

    await persistTrialRecord(trial);
    await logTrialAudit(adminId, adminEmail, cleanEmail, 'extend', { additionalMinutes, reactivated: true, newExpiresAt: trial.expires_at }, trial.id);

    return {
      success: true,
      message: `Teste de ${cleanEmail} foi reativado com sucesso por mais ${additionalMinutes} minutos! O novo período já está em andamento.`,
      trial
    };
  }

  return { success: false, message: 'Estado desconhecido de teste.' };
}

/**
 * Cancel an authorized trial
 */
export async function cancelTrial(
  adminId: string,
  adminEmail: string | undefined,
  targetEmail: string,
  reason?: string
): Promise<{ success: boolean; message: string; trial?: TrialRecord }> {
  const cleanEmail = targetEmail.toLowerCase().trim();
  const trial = await getTrialByEmail(cleanEmail);

  if (!trial) {
    return {
      success: false,
      message: `Não foi encontrado nenhum teste cadastrado para o e-mail ${cleanEmail}.`
    };
  }

  trial.status = 'cancelled';
  trial.updated_at = new Date().toISOString();
  if (reason) trial.notes = `Cancelado: ${reason}`;

  await persistTrialRecord(trial);
  await logTrialAudit(adminId, adminEmail, cleanEmail, 'cancel', { reason }, trial.id);

  return {
    success: true,
    message: `O teste de ${cleanEmail} foi cancelado com sucesso pelo administrador.`,
    trial
  };
}

/**
 * Format date for friendly display
 */
function formatDateBr(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return isoStr;
  }
}

/**
 * Check and format status of a trial for admin query
 */
export async function checkTrialStatusForAdmin(
  adminId: string,
  adminEmail: string | undefined,
  targetEmail: string
): Promise<{ success: boolean; message: string; trial?: TrialRecord }> {
  const cleanEmail = targetEmail.toLowerCase().trim();
  const trial = await getTrialByEmail(cleanEmail);

  await logTrialAudit(adminId, adminEmail, cleanEmail, 'check_status');

  if (!trial) {
    return {
      success: false,
      message: `Nenhum teste encontrado para o e-mail ${cleanEmail}.`
    };
  }

  const nowMs = Date.now();
  let statusText = '';

  switch (trial.status) {
    case 'pending':
      statusText = `⏳ **Status: Pendente (aguardando primeiro acesso)**
• **Conta:** ${trial.email}
• **Duração autorizada:** ${trial.duration_minutes} minutos
• **Liberado em:** ${formatDateBr(trial.released_at)}
• **Responsável:** ${trial.admin_email || 'Administrador'}
*O tempo começará a contar automaticamente assim que o usuário entrar no MCO.*`;
      break;

    case 'active':
      const expiresMs = trial.expires_at ? new Date(trial.expires_at).getTime() : 0;
      if (nowMs >= expiresMs) {
        trial.status = 'expired';
        trial.updated_at = new Date().toISOString();
        await persistTrialRecord(trial);
        statusText = `🔴 **Status: Expirado**
• **Conta:** ${trial.email}
• **Início:** ${formatDateBr(trial.started_at)}
• **Encerrado em:** ${formatDateBr(trial.expires_at)}
• **Extensões realizadas:** ${trial.extensions_count}`;
      } else {
        const remainingMinutes = Math.ceil((expiresMs - nowMs) / 60000);
        statusText = `🟢 **Status: Ativo (em andamento)**
• **Conta:** ${trial.email}
• **Tempo restante:** **${remainingMinutes} minuto(s)**
• **Primeiro acesso:** ${formatDateBr(trial.started_at)}
• **Expira em:** ${formatDateBr(trial.expires_at)}
• **Duração total:** ${trial.duration_minutes} minutos
• **Extensões realizadas:** ${trial.extensions_count}`;
      }
      break;

    case 'expired':
      statusText = `🔴 **Status: Expirado**
• **Conta:** ${trial.email}
• **Início:** ${formatDateBr(trial.started_at)}
• **Encerrado em:** ${formatDateBr(trial.expires_at)}
• **Duração total:** ${trial.duration_minutes} minutos
• **Extensões realizadas:** ${trial.extensions_count}`;
      break;

    case 'cancelled':
      statusText = `⛔ **Status: Cancelado pelo Administrador**
• **Conta:** ${trial.email}
• **Última atualização:** ${formatDateBr(trial.updated_at)}
• **Observação:** ${trial.notes || 'Sem observação'}`;
      break;
  }

  return {
    success: true,
    message: statusText,
    trial
  };
}

/**
 * Handle user system access and evaluate/start trial
 * OFFICIAL SERVER TIME RULE: The server clock is the only source of truth.
 */
export async function evaluateUserTrialAccess(
  userId: string,
  email: string
): Promise<TrialStatusResponse> {
  const cleanEmail = email.toLowerCase().trim();
  const trial = await getTrialByEmail(cleanEmail);

  if (!trial) {
    return {
      isTrial: false,
      serverTime: new Date().toISOString()
    };
  }

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();

  // 1. Pending first access -> Activate now!
  if (trial.status === 'pending') {
    trial.status = 'active';
    trial.user_id = userId;
    trial.started_at = nowIso;
    const expiresMs = nowMs + trial.duration_minutes * 60000;
    trial.expires_at = new Date(expiresMs).toISOString();
    trial.updated_at = nowIso;

    await persistTrialRecord(trial);
    console.log(`[TrialService] Primeiro acesso do usuário ${cleanEmail}! Teste iniciado. Expira em: ${trial.expires_at}`);

    return {
      isTrial: true,
      trial,
      status: 'active',
      remainingSeconds: trial.duration_minutes * 60,
      startedAt: trial.started_at,
      expiresAt: trial.expires_at,
      durationMinutes: trial.duration_minutes,
      expired: false,
      serverTime: nowIso
    };
  }

  // 2. Active test -> Validate expiration
  if (trial.status === 'active') {
    const expiresMs = trial.expires_at ? new Date(trial.expires_at).getTime() : 0;
    
    // Check if expired
    if (nowMs >= expiresMs) {
      trial.status = 'expired';
      trial.updated_at = nowIso;
      await persistTrialRecord(trial);
      console.log(`[TrialService] Teste do usuário ${cleanEmail} atingiu o término oficial e foi marcado como expirado.`);

      return {
        isTrial: true,
        trial,
        status: 'expired',
        remainingSeconds: 0,
        startedAt: trial.started_at,
        expiresAt: trial.expires_at,
        durationMinutes: trial.duration_minutes,
        expired: true,
        serverTime: nowIso
      };
    }

    // Active with remaining time
    const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
    return {
      isTrial: true,
      trial,
      status: 'active',
      remainingSeconds,
      startedAt: trial.started_at,
      expiresAt: trial.expires_at,
      durationMinutes: trial.duration_minutes,
      expired: false,
      serverTime: nowIso
    };
  }

  // 3. Expired or Cancelled
  return {
    isTrial: true,
    trial,
    status: trial.status,
    remainingSeconds: 0,
    startedAt: trial.started_at,
    expiresAt: trial.expires_at,
    durationMinutes: trial.duration_minutes,
    expired: true,
    serverTime: nowIso
  };
}

/**
 * Natural language command parser for Admin Trial Operations
 */
export function parseTrialNaturalLanguageCommand(message: string): {
  isTrialCommand: boolean;
  action?: 'grant' | 'extend' | 'cancel' | 'check_status';
  targetEmail?: string;
  durationMinutes?: number;
} {
  const text = message.trim();
  const lower = text.toLowerCase();

  // Look for email in message
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const targetEmail = emailMatch ? emailMatch[0].toLowerCase().trim() : undefined;

  // Check if text touches trial / teste
  const mentionsTrial = lower.includes('teste') || lower.includes('trial') || lower.includes('demonstra');
  if (!mentionsTrial && !lower.includes('liberar') && !lower.includes('estender') && !lower.includes('cancelar')) {
    return { isTrialCommand: false };
  }

  // Duration parser helper: "30 minutos", "60 min", "2 horas", "1 hora", "45m"
  let durationMinutes = 30; // default 30 min
  const hourMatch = lower.match(/(\d+)\s*(?:hora|horas|h)\b/);
  const minMatch = lower.match(/(\d+)\s*(?:minuto|minutos|min|m)\b/);

  if (hourMatch) {
    durationMinutes = parseInt(hourMatch[1], 10) * 60;
  } else if (minMatch) {
    durationMinutes = parseInt(minMatch[1], 10);
  }

  // 1. Grant / Liberar
  if (lower.includes('liberar') || lower.includes('conceder') || lower.includes('ativar') || lower.includes('criar teste')) {
    if (targetEmail) {
      return {
        isTrialCommand: true,
        action: 'grant',
        targetEmail,
        durationMinutes
      };
    }
  }

  // 2. Extend / Estender / Prorrogar
  if (lower.includes('estender') || lower.includes('prorrogar') || lower.includes('aumentar') || lower.includes('adicionar tempo')) {
    if (targetEmail) {
      return {
        isTrialCommand: true,
        action: 'extend',
        targetEmail,
        durationMinutes: durationMinutes || 30
      };
    }
  }

  // 3. Cancel / Cancelar / Bloquear
  if (lower.includes('cancelar') || lower.includes('revogar') || lower.includes('remover teste') || lower.includes('encerrar teste')) {
    if (targetEmail) {
      return {
        isTrialCommand: true,
        action: 'cancel',
        targetEmail
      };
    }
  }

  // 4. Check status / Consultar
  if (lower.includes('consultar') || lower.includes('status') || lower.includes('verificar') || lower.includes('como está') || lower.includes('como esta')) {
    if (targetEmail) {
      return {
        isTrialCommand: true,
        action: 'check_status',
        targetEmail
      };
    }
  }

  return { isTrialCommand: false };
}
