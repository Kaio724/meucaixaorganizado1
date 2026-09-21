import { createClient } from '@supabase/supabase-js';

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET: Health check & configuration status
  if (event.httpMethod === 'GET') {
    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'online',
        service: 'MCO Wiven Webhook (Netlify Serverless)',
        configured: hasServiceKey,
        instructions: hasServiceKey
          ? 'Webhook pronto para receber notificações de compra aprovada da Wiven!'
          : 'Atenção: Adicione a variável SUPABASE_SERVICE_ROLE_KEY nas configurações de ambiente da Netlify para que as contas possam ser criadas automaticamente no Supabase.'
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Utilize POST para o webhook.' })
    };
  }

  try {
    let body: any = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (parseErr) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Corpo da requisição inválido (JSON esperado).' })
        };
      }
    }

    // Extract customer & order information
    const customer = body.customer || body.Customer || body.buyer || body.Buyer || body.client || body.Client || body.data?.customer || body.data?.buyer || {};
    const order = body.order || body.Order || body.data?.order || {};
    const product = body.product || body.Product || body.data?.product || {};
    const offer = body.offer || body.Offer || body.data?.offer || {};

    const rawEmail = customer.email || body.email || body.buyer_email || body.client_email || body.data?.email || '';
    const email = String(rawEmail).toLowerCase().trim();

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'E-mail do comprador não encontrado no payload enviado pela Wiven.' })
      };
    }

    const rawName = customer.name || customer.full_name || customer.first_name || body.name || body.buyer_name || body.client_name || '';
    const name = String(rawName).trim() || email.split('@')[0];

    // Status verification
    const rawStatus = body.status || body.event || body.event_type || order.status || body.data?.status || 'approved';
    const status = String(rawStatus).toLowerCase().trim();

    // Check if status is a non-paid/refund event
    if (status.includes('refund') || status.includes('reembolso') || status.includes('chargeback') || status.includes('cancel') || status.includes('waiting') || status.includes('pending') || status.includes('aguardando')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Evento com status ${status} ignorado. Nenhuma conta criada.` })
      };
    }

    // Parse amount
    let rawAmount = order.total ?? order.amount ?? body.total ?? body.amount ?? body.price ?? body.valor ?? body.data?.amount ?? 0;
    if (typeof rawAmount === 'string') {
      rawAmount = parseFloat(rawAmount.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    }
    let amount = Number(rawAmount) || 0;
    if (amount > 1000) {
      amount = amount / 100;
    }

    const offerCode = String(offer.code || offer.id || body.offer_code || body.offerCode || body.offer || '').trim().toLowerCase();
    const productName = String(product.name || product.title || body.product_name || body.product || '').trim().toLowerCase();

    // Plan determination:
    // R$ 47,00 -> pro (MCO Completo)
    // R$ 12,90 -> pro (Upgrade)
    // R$ 27,90 -> essential (MCO Essencial)
    let plan: 'pro' | 'essential' = 'essential';
    if (
      offerCode.includes('lejvtnc') ||
      productName.includes('upgrade') ||
      productName.includes('completo') ||
      productName.includes('pro') ||
      amount >= 40 ||
      (amount >= 11 && amount <= 16)
    ) {
      plan = 'pro';
    }

    const planName = plan === 'pro' ? 'MCO Completo' : 'MCO Essencial';

    // Supabase Admin connection
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yfbgauajvijwngvhrkms.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('[Netlify Function Webhook] SUPABASE_SERVICE_ROLE_KEY não configurada!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'SUPABASE_SERVICE_ROLE_KEY ausente nas variáveis de ambiente da Netlify. Adicione a chave service_role do Supabase.'
        })
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const defaultPassword = 'user1234';
    let userId: string | null = null;
    let isNewUser = false;

    // 1. Create user in auth
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        nome: name,
        plano: plan,
        origem: 'wiven_webhook'
      }
    });

    if (createData?.user) {
      userId = createData.user.id;
      isNewUser = true;
    } else if (createError) {
      // Find existing user
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === email);

      if (existingUser) {
        userId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            nome: name || existingUser.user_metadata?.nome,
            plano: plan,
            ultimo_upgrade: new Date().toISOString()
          }
        });
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` })
        };
      }
    }

    if (!userId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Não foi possível definir o ID do usuário no Supabase.' })
      };
    }

    // 2. Upsert in profiles table
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        nome: name,
        plano: plan,
        tipo_negocio: 'autonomo',
        nome_negocio: ''
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Netlify Function Webhook] Aviso na tabela profiles:', e);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: isNewUser
          ? `Usuário ${email} criado com sucesso com a senha padrão "user1234" e plano ${planName}.`
          : `Usuário ${email} atualizado para o plano ${planName} com sucesso.`,
        data: {
          email,
          name,
          plan,
          planName,
          isNewUser,
          userId
        }
      })
    };
  } catch (err: any) {
    console.error('[Netlify Function Webhook] Erro inesperado:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Erro interno ao processar webhook da Wiven.' })
    };
  }
};
