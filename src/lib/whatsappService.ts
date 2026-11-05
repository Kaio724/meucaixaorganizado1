/**
 * WhatsApp integration helper for MCO Plan Hiring
 */

// Retrieve configured administrator WhatsApp number
// If not configured, prompts the administrator to set VITE_WHATSAPP_ADMIN_NUMBER in environment variables
export function getAdminWhatsAppNumber(): string {
  const envNumber = (import.meta as any).env.VITE_WHATSAPP_ADMIN_NUMBER || 
                    (import.meta as any).env.VITE_ADMIN_WHATSAPP || 
                    '';
  // Clean non-digits
  return envNumber.replace(/\D/g, '');
}

export function hasConfiguredWhatsAppNumber(): boolean {
  return getAdminWhatsAppNumber().length >= 10;
}

export interface WhatsAppHireLinkOptions {
  planName: 'Essencial' | 'MCO Completo';
  userEmail?: string;
  price?: string;
}

/**
 * Builds the pre-filled WhatsApp hiring link following official MCO templates
 */
export function buildWhatsAppHireLink({
  planName,
  userEmail,
  price
}: WhatsAppHireLinkOptions): { url: string; hasNumber: boolean; message: string } {
  let message = '';

  if (planName === 'Essencial') {
    message = 'Olá! Testei o Meu Caixa Organizado e gostaria de contratar o plano Essencial. Poderia me passar as informações para continuar?';
  } else {
    const formattedPrice = price || 'R$ 47,00';
    message = `Olá! Testei o Meu Caixa Organizado e gostaria de contratar o plano MCO Completo por ${formattedPrice}. Poderia me passar as informações para continuar?`;
  }

  // Append account identifier and origin metadata if available
  const cleanEmail = userEmail?.trim();
  if (cleanEmail) {
    message += ` (Conta: ${cleanEmail} | Origem: Teste gratuito MCO)`;
  } else {
    message += ` (Origem: Teste gratuito MCO)`;
  }

  const encodedText = encodeURIComponent(message);
  const number = getAdminWhatsAppNumber();

  if (number) {
    return {
      url: `https://wa.me/${number}?text=${encodedText}`,
      hasNumber: true,
      message
    };
  }

  // Fallback to open WhatsApp web/app with pre-filled text if phone number is not yet in .env
  return {
    url: `https://api.whatsapp.com/send?text=${encodedText}`,
    hasNumber: false,
    message
  };
}

/**
 * Log hiring intent to backend audit/analytics
 */
export async function recordHiringIntent(planName: string, userEmail?: string): Promise<void> {
  try {
    await fetch('/api/trial/hire-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planName,
        userEmail: userEmail || 'unknown',
        timestamp: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('[WhatsAppService] Falha ao registrar intenção de contratação:', err);
  }
}
