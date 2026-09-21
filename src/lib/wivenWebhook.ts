import { createClient } from '@supabase/supabase-js';

export interface WivenSaleData {
  email: string;
  name: string;
  amount: number;
  offerCode: string;
  productName: string;
  status: string;
  plan: 'pro' | 'essential';
  planName: string;
}

/**
 * Extracts and normalizes customer & sale information from various
 * Wiven webhook payload structures (raw JSON, nested objects, etc.)
 */
export function extractCustomerAndSale(body: any): WivenSaleData {
  if (!body || typeof body !== 'object') {
    return {
      email: '',
      name: '',
      amount: 0,
      offerCode: '',
      productName: '',
      status: 'unknown',
      plan: 'essential',
      planName: 'MCO Essencial'
    };
  }

  // Nested structures support
  const customer = body.customer || body.Customer || body.buyer || body.Buyer || body.client || body.Client || body.data?.customer || body.data?.buyer || {};
  const order = body.order || body.Order || body.data?.order || {};
  const product = body.product || body.Product || body.data?.product || {};
  const offer = body.offer || body.Offer || body.data?.offer || {};

  // Email
  const rawEmail = customer.email || body.email || body.buyer_email || body.client_email || body.data?.email || '';
  const email = String(rawEmail).toLowerCase().trim();

  // Name
  const rawName = customer.name || customer.full_name || customer.first_name || body.name || body.buyer_name || body.client_name || '';
  const name = String(rawName).trim() || (email ? email.split('@')[0] : 'Cliente');

  // Status
  const rawStatus = body.status || body.event || body.event_type || order.status || body.data?.status || 'approved';
  const status = String(rawStatus).toLowerCase().trim();

  // Amount parsing
  let rawAmount = order.total ?? order.amount ?? body.total ?? body.amount ?? body.price ?? body.valor ?? body.data?.amount ?? 0;
  if (typeof rawAmount === 'string') {
    rawAmount = parseFloat(rawAmount.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
  }
  let amount = Number(rawAmount) || 0;
  // If amount is in cents (e.g. 4700 or 2790), convert to currency units
  if (amount > 1000) {
    amount = amount / 100;
  }

  // Offer and Product info
  const offerCode = String(offer.code || offer.id || body.offer_code || body.offerCode || body.offer || '').trim();
  const productName = String(product.name || product.title || body.product_name || body.product || '').trim();

  // Plan determination:
  // - R$ 47,00 -> pro (MCO Completo)
  // - R$ 12,90 -> pro (Upgrade para MCO Completo)
  // - R$ 27,90 -> essential (MCO Essencial)
  const normProduct = productName.toLowerCase();
  const normOffer = offerCode.toLowerCase();

  let plan: 'pro' | 'essential' = 'essential';

  if (
    normOffer.includes('lejvtnc') ||
    normProduct.includes('upgrade') ||
    normProduct.includes('completo') ||
    normProduct.includes('pro') ||
    amount >= 40 ||
    (amount >= 11 && amount <= 16)
  ) {
    plan = 'pro';
  } else {
    plan = 'essential';
  }

  const planName = plan === 'pro' ? 'MCO Completo' : 'MCO Essencial';

  return {
    email,
    name,
    amount,
    offerCode,
    productName,
    status,
    plan,
    planName
  };
}

/**
 * Validates if the webhook status represents an approved/paid purchase.
 */
export function isPurchaseApproved(status: string): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  // Ignored events (cart abandonment, chargeback, refund, pending boleto)
  if (s.includes('refund') || s.includes('reembolso') || s.includes('chargeback') || s.includes('cancel') || s.includes('waiting') || s.includes('pending') || s.includes('aguardando')) {
    return false;
  }
  return (
    s.includes('approv') ||
    s.includes('aprovad') ||
    s.includes('paid') ||
    s.includes('pago') ||
    s.includes('complete') ||
    s.includes('concluid') ||
    s.includes('authorized') ||
    s.includes('order_created') ||
    s.includes('compra')
  );
}

/**
 * Creates or updates the user in Supabase Auth & profiles table with standard password "user1234".
 */
export async function processWivenWebhook(body: any): Promise<{
  success: boolean;
  message: string;
  data?: {
    email: string;
    name: string;
    plan: 'pro' | 'essential';
    planName: string;
    isNewUser: boolean;
    userId: string;
  };
}> {
  const sale = extractCustomerAndSale(body);

  if (!sale.email) {
    return {
      success: false,
      message: 'E-mail do comprador não encontrado no payload enviado pela Wiven.'
    };
  }

  if (!isPurchaseApproved(sale.status)) {
    return {
      success: false,
      message: `Status de pedido ignorado (${sale.status}). Apenas pagamentos aprovados criam acesso.`
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yfbgauajvijwngvhrkms.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    const errorMsg = 'A variável de ambiente SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor/Netlify. Obtenha a service_role secret no painel do Supabase (Project Settings > API) e adicione nas variáveis de ambiente.';
    console.error(`[Webhook Wiven] ${errorMsg}`);
    return {
      success: false,
      message: errorMsg
    };
  }

  // Initialize Admin Supabase Client (bypasses RLS and handles user provisioning)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const defaultPassword = 'user1234';
  let userId: string | null = null;
  let isNewUser = false;

  // 1. Attempt to create the user with confirmed email and password 'user1234'
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: sale.email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      nome: sale.name,
      plano: sale.plan,
      origem: 'wiven_webhook'
    }
  });

  if (createData?.user) {
    userId = createData.user.id;
    isNewUser = true;
    console.log(`[Webhook Wiven] Novo usuário criado com sucesso: ${sale.email} (ID: ${userId}) - Plano: ${sale.planName}`);
  } else if (createError) {
    console.log(`[Webhook Wiven] Usuário já existente ou retorno informativo: ${createError.message}`);
    
    // User already exists, search user to get ID and update metadata
    try {
      const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (listError) {
        throw listError;
      }

      const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === sale.email.toLowerCase());
      if (existingUser) {
        userId = existingUser.id;
        
        // Update user metadata to reflect new plan & confirm email
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            nome: sale.name || existingUser.user_metadata?.nome,
            plano: sale.plan,
            ultimo_upgrade: new Date().toISOString()
          }
        });
        console.log(`[Webhook Wiven] Usuário existente atualizado: ${sale.email} (ID: ${userId}) -> Plano: ${sale.planName}`);
      } else {
        return {
          success: false,
          message: `Falha ao localizar usuário existente no Supabase: ${createError.message}`
        };
      }
    } catch (findErr: any) {
      return {
        success: false,
        message: `Erro ao buscar usuário existente no Supabase: ${findErr.message}`
      };
    }
  }

  if (!userId) {
    return {
      success: false,
      message: 'Não foi possível definir o ID do usuário no Supabase.'
    };
  }

  // 2. Upsert profile in the "profiles" table
  try {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        nome: sale.name,
        plano: sale.plan,
        tipo_negocio: 'autonomo',
        nome_negocio: ''
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn('[Webhook Wiven] Aviso ao salvar tabela profiles (pode ser coluna ausente):', profileError.message);
      // Retry without plano column if table doesn't have it yet
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          nome: sale.name,
          tipo_negocio: 'autonomo',
          nome_negocio: ''
        }, { onConflict: 'id' });
    }
  } catch (profErr: any) {
    console.warn('[Webhook Wiven] Erro ao sincronizar tabela profiles:', profErr.message);
  }

  return {
    success: true,
    message: isNewUser
      ? `Usuário ${sale.email} cadastrado com sucesso com a senha padrão "${defaultPassword}" e plano ${sale.planName}.`
      : `Usuário ${sale.email} atualizado para o plano ${sale.planName} com sucesso.`,
    data: {
      email: sale.email,
      name: sale.name,
      plan: sale.plan,
      planName: sale.planName,
      isNewUser,
      userId
    }
  };
}
