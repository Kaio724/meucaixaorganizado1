import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

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
