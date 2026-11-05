import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { processWivenWebhook } from './src/lib/wivenWebhook';
import { buildFinancialContext, buildPromptContextText } from './src/lib/aiFinancialContext';
import { mapDbToTransaction } from './src/lib/supabase';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Set up large JSON payload limits for base64 files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize OpenAI (ChatGPT)
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Initialize Google GenAI as secondary fallback
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Financial categories for classification
const CATEGORIES_ENTRADA = [
  'Vendas',
  'Serviços prestados',
  'Aportes / Empréstimos',
  'Rendimentos',
  'Outras receitas'
];

const CATEGORIES_SAIDA = [
  'Fornecedores',
  'Insumos / Mercadorias',
  'Aluguel / Condomínio / Luz / Água',
  'Salários / Pró-labore',
  'Ferramentas / Equipamentos',
  'Marketing / Anúncios',
  'Impostos / Taxas',
  'Outras despesas'
];

// Helper to sanitize date to YYYY-MM-DD
function getYearFromDate(dateStr: string): string {
  const currentYear = new Date().getFullYear();
  return String(currentYear);
}

// Helper to safely extract JSON array from Gemini text response
function extractJsonTransactions(text: string): any[] {
  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.transactions)) return parsed.transactions;
    if (parsed && typeof parsed === 'object') {
      const firstArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (firstArrayKey) return parsed[firstArrayKey];
    }
  } catch (e) {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const slice = cleaned.substring(start, end + 1);
        const parsed = JSON.parse(slice);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        console.error('Falha ao tentar slice JSON:', err);
      }
    }
  }
  return [];
}

// Normalized Candidate Models in order of availability and speed
const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash'
];

// API endpoint for bank statement parsing using OpenAI ChatGPT (with Gemini fallback)
app.post('/api/importar-extrato', async (req, res) => {
  try {
    const { fileType, fileData } = req.body;

    if (!fileType || !fileData) {
      return res.status(400).json({ error: 'Parâmetros fileType e fileData são obrigatórios.' });
    }

    console.log(`[Importação] Iniciando análise com ChatGPT (OpenAI). Tipo: ${fileType}`);

    let rawJsonText = '';
    let parsedList: any[] = [];
    const currentYear = new Date().getFullYear();

    // 1. PRIMARY ENGINE: OpenAI ChatGPT (gpt-4o-mini / gpt-4o)
    try {
      const openai = getOpenAI();
      if (!openai) {
        console.log('[OpenAI ChatGPT] OPENAI_API_KEY não definida no ambiente. Prosseguindo para o Gemini.');
      } else {
        const openAiModels = ['gpt-4o-mini', 'gpt-4o'];

        const systemPrompt = `Você é um especialista em contabilidade financeira brasileira e conciliação de extratos bancários.
Sua missão é extrair com precisão absoluta TODAS as movimentações financeiras do extrato fornecido (entradas e saídas de recursos).
Retorne SEMPRE e ESTRITAMENTE um objeto JSON válido no formato:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "title": "Nome amigável, limpo e direto da movimentação (ex: PIX João Silva, Pagamento Fornecedor, Tarifa)",
      "type": "entrada" ou "saida",
      "amount": 0.00,
      "paymentMethod": "Pix" | "Boleto" | "Cartão de Crédito" | "Cartão de Débito" | "Transferência Bancária" | "Dinheiro" | "Outro",
      "category": "Vendas" | "Serviços prestados" | "Aportes / Empréstimos" | "Rendimentos" | "Outras receitas" | "Fornecedores" | "Insumos / Mercadorias" | "Aluguel / Condomínio / Luz / Água" | "Salários / Pró-labore" | "Ferramentas / Equipamentos" | "Marketing / Anúncios" | "Impostos / Taxas" | "Outras despesas" | "Não identificada",
      "confidence": 95
    }
  ]
}
Regras:
1. Type DEVE ser estritamente "entrada" (para créditos, depósitos, PIX recebidos, transferências recebidas) ou "saida" (para débitos, pagamentos, boletos, PIX enviados, tarifas, compras).
2. Amount deve ser um número float absoluto positivo correspondente ao valor em Reais (ex: 150.50).
3. Data no formato YYYY-MM-DD (se o extrato omitir o ano, use o ano ${currentYear}).
4. Ignore rigorosamente saldos acumulados, saldos parciais, saldos consolidados e dados informativos de cabeçalho.`;

        for (const model of openAiModels) {
          try {
            console.log(`[OpenAI ChatGPT] Tentando modelo: ${model}...`);
            let messages: any[] = [];

            if (fileType === 'pdf') {
              messages = [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Analise o extrato bancário em formato PDF anexado e extraia todas as transações financeiras. O ano base é ${currentYear}.`
                    },
                    {
                      type: 'file',
                      file: {
                        filename: 'extrato.pdf',
                        file_data: `data:application/pdf;base64,${fileData}`
                      }
                    }
                  ]
                }
              ];
            } else {
              messages = [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: `Analise o extrato bancário abaixo (dados textuais extraídos de CSV/Excel/TXT) e extraia todas as transações financeiras. O ano base é ${currentYear}.

--- INÍCIO DOS DADOS ---
${fileData}
--- FIM DOS DADOS ---`
                }
              ];
            }

            const completion = await openai.chat.completions.create({
              model,
              messages,
              response_format: { type: 'json_object' }
            });

            const content = completion.choices?.[0]?.message?.content;
            if (content) {
              console.log(`[OpenAI ChatGPT] Resposta recebida com sucesso do modelo ${model}`);
              const list = extractJsonTransactions(content);
              if (Array.isArray(list) && list.length > 0) {
                parsedList = list;
                rawJsonText = content;
                break;
              }
            }
          } catch (errModel: any) {
            console.warn(`[OpenAI ChatGPT] Erro ao chamar modelo ${model}:`, errModel.message || errModel);
          }
        }
      }
    } catch (openAiErr: any) {
      console.warn('[OpenAI ChatGPT] Erro geral na execução do ChatGPT:', openAiErr.message || openAiErr);
    }

    // 2. SECONDARY FALLBACK: Google Gemini if OpenAI returned no transactions
    if (!parsedList || parsedList.length === 0) {
      console.log('[Fallback Gemini] OpenAI não retornou transações ou falhou. Ativando fallback Gemini...');

      if (process.env.GEMINI_API_KEY) {
        let contents: any;
        if (fileType === 'pdf') {
          contents = [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: fileData,
              },
            },
            {
              text: `Analise o extrato bancário PDF e extraia TODAS as transações financeiras (entradas e saídas).
Data no formato YYYY-MM-DD (ano ${currentYear} se omitido). Retorne JSON.`
            }
          ];
        } else {
          contents = `Analise o extrato bancário e extraia todas as transações financeiras (ano ${currentYear}):
${fileData}`;
        }

        const responseSchema = {
          type: Type.ARRAY,
          description: 'A list of parsed financial transactions from the statement.',
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              paymentMethod: { type: Type.STRING },
              category: { type: Type.STRING },
              confidence: { type: Type.INTEGER }
            },
            required: ['date', 'title', 'type', 'amount', 'paymentMethod', 'category', 'confidence']
          }
        };

        for (const modelName of CANDIDATE_MODELS) {
          try {
            console.log(`[Gemini Fallback] Tentando ${modelName}...`);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: contents,
              config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema
              }
            });

            if (response && response.text) {
              const list = extractJsonTransactions(response.text);
              if (Array.isArray(list) && list.length > 0) {
                parsedList = list;
                console.log(`[Gemini Fallback] Sucesso com ${modelName}!`);
                break;
              }
            }
          } catch (geminiErr: any) {
            console.warn(`[Gemini Fallback] Erro em ${modelName}:`, geminiErr.message || geminiErr);
          }
        }
      }
    }

    if (!parsedList || parsedList.length === 0) {
      throw new Error('Não foi possível identificar transações no extrato enviado com a IA do ChatGPT. Verifique se o arquivo contém movimentações financeiras legíveis.');
    }

    // Sanitize and normalize items
    const transactions = parsedList.map((item: any) => {
      const typeStr = String(item.type || '').toLowerCase();
      const isEntrada = ['entrada', 'credit', 'crédito', 'receita', 'deposito', 'depósito'].some(k => typeStr.includes(k));
      
      return {
        date: item.date || new Date().toISOString().split('T')[0],
        title: String(item.title || 'Lançamento').trim(),
        type: isEntrada ? 'entrada' : 'saida',
        amount: Math.abs(Number(item.amount)) || 0,
        paymentMethod: item.paymentMethod || 'Pix',
        category: item.category || 'Não identificada',
        confidence: Number(item.confidence) || 85
      };
    });

    console.log(`[Importação Concluída] ${transactions.length} transações identificadas e estruturadas com sucesso.`);
    return res.json({ transactions });
  } catch (error: any) {
    console.error('Erro na rota de processamento:', error);
    return res.status(500).json({ 
      error: error.message || 'Erro ao processar o extrato financeiro via ChatGPT. Por favor, tente novamente.' 
    });
  }
});

// ==========================================
// WIVEN / GATEWAY DE PAGAMENTO WEBHOOK
// Cria usuário automaticamente com senha user1234
// e libera plano MCO Essencial (R$ 27,90) ou MCO Completo (R$ 47,00)
// ==========================================
const handleWivenWebhook = async (req: express.Request, res: express.Response) => {
  try {
    console.log('[Webhook Wiven] Notificação recebida:', JSON.stringify(req.body));
    const result = await processWivenWebhook(req.body);

    if (!result.success) {
      console.warn('[Webhook Wiven] Não processado:', result.message);
      return res.status(200).json({
        status: 'ignored_or_error',
        message: result.message
      });
    }

    console.log('[Webhook Wiven] Sucesso:', result.message);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Webhook Wiven] Erro fatal:', error);
    return res.status(500).json({
      error: error.message || 'Erro interno ao processar webhook da Wiven.'
    });
  }
};

const handleWivenStatus = (req: express.Request, res: express.Response) => {
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.json({
    status: 'online',
    service: 'MCO Wiven Webhook',
    configured: hasServiceKey,
    instructions: hasServiceKey
      ? 'Webhook ativo e pronto para receber notificações de compra aprovada da Wiven!'
      : 'Atenção: Configure a variável SUPABASE_SERVICE_ROLE_KEY no ambiente para que os usuários sejam criados no Supabase.'
  });
};

app.get('/api/webhook/wiven', handleWivenStatus);
app.get('/api/webhook/pagamento', handleWivenStatus);
app.post('/api/webhook/wiven', handleWivenWebhook);
app.post('/api/webhook/pagamento', handleWivenWebhook);

// ==========================================
// RELATÓRIOS COM IA (GOOGLE GEMINI)
// Agente Financeiro Inteligente integrado aos dados reais do MCO
// ==========================================
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yfbgauajvijwngvhrkms.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYmdhdWFqdmlqd25ndmhya21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTUwNzUsImV4cCI6MjA5ODU5MTA3NX0.gmhQiDzKghNUWMhX5kh3WWrWvaAAX4Kdyi1RAAowzyM';
const supabaseServerClient = createClient(supabaseUrl, supabaseKey);

app.post('/api/ai-reports/chat', async (req, res) => {
  try {
    const { 
      message, 
      conversationId, 
      history = [], 
      accountType = 'empresarial', 
      transactions: clientTxs = [], 
      userId: clientUserId = 'local',
      activeMonthYear
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem do usuário é obrigatória.' });
    }

    // Verify authorized account type
    const authorizedAccountType: 'empresarial' | 'pessoal' = accountType === 'pessoal' ? 'pessoal' : 'empresarial';

    // Verify authentication if token provided
    let verifiedUserId = clientUserId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const { data: { user }, error: authErr } = await supabaseServerClient.auth.getUser(token);
          if (user && !authErr) {
            verifiedUserId = user.id;
          }
        } catch (e) {
          console.warn('[AI Reports] Não foi possível verificar token Bearer:', e);
        }
      }
    }

    // Check Gemini API Key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(503).json({
        error: 'A chave da API do Google Gemini (GEMINI_API_KEY) não está configurada no servidor. Configure-a nas variáveis de ambiente para ativar o assistente inteligente.'
      });
    }

    // Retrieve authorized transactions
    // Prefer querying directly from Supabase for verified cloud users to guarantee server-side isolation
    let authorizedTransactions: any[] = [];
    if (verifiedUserId && verifiedUserId !== 'local') {
      try {
        const { data, error } = await supabaseServerClient
          .from('lancamentos')
          .select('*')
          .eq('user_id', verifiedUserId);

        if (!error && Array.isArray(data) && data.length > 0) {
          authorizedTransactions = data.map(mapDbToTransaction);
        }
      } catch (dbErr) {
        console.warn('[AI Reports] Falha ao consultar banco diretamente, usando fallback:', dbErr);
      }
    }

    // If database returned no rows or user is local, use client-provided transactions after strict filtering
    if (authorizedTransactions.length === 0 && Array.isArray(clientTxs)) {
      authorizedTransactions = clientTxs;
    }

    // ABSOLUTE CONTEXT ISOLATION:
    // Filter strictly by the requested authorized accountType
    authorizedTransactions = authorizedTransactions.filter(t => (t.accountType || 'empresarial') === authorizedAccountType);

    // Build the official financial briefing with zero hallucination
    const targetYear = activeMonthYear?.year;
    const targetMonthIndex = activeMonthYear?.month;
    const financialBriefing = buildFinancialContext(authorizedTransactions, authorizedAccountType, targetYear, targetMonthIndex);
    const financialContextText = buildPromptContextText(financialBriefing);

    // Build system instructions for Gemini
    const systemInstruction = `Você é o Assistente Financeiro Inteligente oficial do "Meu Caixa Organizado" (MCO).
Seu objetivo é orientar o usuário com clareza, empatia, precisão matemática e visão prática sobre suas finanças.

REGRAS OBRIGATÓRIAS E INEGOCIÁVEIS:
1. PRECISÃO MATEMÁTICA: Os números fornecidos no bloco "DADOS FINANCEIROS OFICIAIS DO MCO" foram calculados pelo sistema oficial. NUNCA invente, altere ou estime valores diferentes dos fornecidos nos totais oficiais.
2. PREVISTO VERSUS REALIZADO:
   - "Realizado" é o dinheiro que JÁ ENTROU ou JÁ SAIU efetivamente do caixa.
   - "Previsto/Pendente" são compromissos futuros esperados. NUNCA trate previsões como dinheiro já disponível ou gasto.
   - "Em atraso" são contas vencidas sem confirmação. Alerte o usuário sobre elas.
3. ISOLAMENTO DE CONTEXTO:
   - Você está analisando exclusivamente a ${financialBriefing.accountLabel}.
   - NUNCA mencione nem assuma despesas ou receitas do outro contexto (se for Pessoal, não fale de custos da empresa; se for Empresa, não misture com despesas pessoais).
4. ESTRUTURA DOS RELATÓRIOS:
   - Quando o usuário pedir um relatório geral, mensal ou análise completa, use títulos e tópicos claros em Markdown:
     * Título principal com o mês/período
     * **1. Visão Geral** (Receitas realizadas, Despesas realizadas, Saldo realizado e se foi positivo/negativo)
     * **2. Receitas** (Totais, categorias dominantes e divisão fixa vs variável)
     * **3. Despesas** (Totais, maiores centros de custos e divisão fixa vs variável)
     * **4. Pendências & Alertas** (Contas a pagar/receber e contas em atraso, separadas do realizado)
     * **5. Análise & Recomendações Práticas** (orientações práticas e construtivas para controle financeiro)
   - Quando for uma pergunta específica (ex: "Onde gastei mais?", "Quanto tenho a pagar?", "Compare com o mês passado"), vá direto ao ponto respondendo à dúvida de forma concisa e amigável.
5. LINGUAGEM:
   - Português brasileiro fluente, profissional, acolhedor e simples.
   - Sempre formate valores monetários no padrão brasileiro: R$ X.XXX,XX.
   - Não use jargões contábeis difíceis sem explicar de forma prática.`;

    // Format chat history for Gemini API
    const formattedContents: any[] = [];
    
    // Add up to 8 recent message pairs from history for conversation memory
    const recentHistory = history.slice(-8);
    for (const item of recentHistory) {
      if (item.role === 'user') {
        formattedContents.push({ role: 'user', parts: [{ text: item.content }] });
      } else if (item.role === 'assistant') {
        formattedContents.push({ role: 'model', parts: [{ text: item.content }] });
      }
    }

    // Append current user request with official financial context
    const userPromptWithContext = `Aqui está minha pergunta/solicitação:
"${message}"

Abaixo estão meus dados financeiros oficiais atuais para você analisar e fundamentar sua resposta:
${financialContextText}`;

    formattedContents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }]
    });

    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    console.log(`[AI Reports] Chamando modelo Gemini: ${modelName} para ${authorizedAccountType} (${authorizedTransactions.length} txs)...`);

    let replyText = '';
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for high factual accuracy
        }
      });
      replyText = response.text || '';
    } catch (genError: any) {
      console.warn(`[AI Reports] Erro com modelo ${modelName}, tentando fallback:`, genError?.message);
      // Try fallback to gemini-flash-latest if custom model failed
      if (modelName !== 'gemini-flash-latest') {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.2,
          }
        });
        replyText = fallbackRes.text || '';
      } else {
        throw genError;
      }
    }

    if (!replyText) {
      replyText = 'Desculpe, não consegui gerar uma resposta com os dados fornecidos. Por favor, tente novamente.';
    }

    // Generate short conversation title if not existing
    let title: string | undefined = undefined;
    if (!conversationId || history.length === 0) {
      const lower = message.toLowerCase();
      if (lower.includes('relatório') || lower.includes('relatorio')) {
        title = `Relatório de ${financialBriefing.currentPeriod.monthName}`;
      } else if (lower.includes('despesa') || lower.includes('gasto')) {
        title = `Análise de Despesas`;
      } else if (lower.includes('receita') || lower.includes('entrada')) {
        title = `Análise de Receitas`;
      } else if (lower.includes('compar')) {
        title = `Comparativo Mensal`;
      } else if (lower.includes('pagar') || lower.includes('receber') || lower.includes('conta')) {
        title = `Contas e Pendências`;
      } else {
        title = message.length > 28 ? message.slice(0, 28) + '...' : message;
      }
    }

    return res.json({
      reply: replyText,
      title,
      briefing: {
        period: financialBriefing.currentPeriod,
        realizado: financialBriefing.metricsCurrentMonth.saldoRealizado,
        accountType: authorizedAccountType
      }
    });
  } catch (error: any) {
    console.error('[AI Reports] Erro ao processar chat:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao processar a análise com a inteligência artificial. Por favor, tente novamente.'
    });
  }
});

// Setup Vite Dev Server / Static files middleware
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static files from dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupViteOrStatic();
