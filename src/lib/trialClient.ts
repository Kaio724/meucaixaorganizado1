import { TrialStatusResponse } from '../types';

/**
 * Fetch trial status for current user from server
 * Uses server time as authoritative clock
 */
export async function fetchUserTrialStatus(
  userId?: string,
  email?: string,
  authToken?: string
): Promise<TrialStatusResponse> {
  try {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (email) params.set('email', email);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`/api/trial/status?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      return { isTrial: false };
    }

    const data: TrialStatusResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[TrialClient] Falha ao consultar status de teste:', err);
    return { isTrial: false };
  }
}

/**
 * Format remaining seconds into a friendly MM:SS or HH:MM:SS string
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${remainingSecs.toString().padStart(2, '0')}s`;
  }

  return `${minutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}
