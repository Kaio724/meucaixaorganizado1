import OpenAI from 'openai';
import { GoogleGenAI, Type } from '@google/genai';

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

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash'
];

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido.' })
    };
  }

  try {
    const { fileType, fileData } = JSON.parse(event.body || '{}');

    if (!fileType || !fileData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Parâmetros fileType e fileData são obrigatórios.' })
      };
    }

    const currentYear = new Date().getFullYear();
    let parsedList: any[] = [];

    // 1. PRIMARY: OpenAI ChatGPT
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey });
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
1. Type DEVE ser estritamente "entrada" ou "saida".
2. Amount deve ser um número float absoluto positivo correspondente ao valor em Reais (ex: 150.50).
3. Data no formato YYYY-MM-DD (se o extrato omitir o ano, use o ano ${currentYear}).
4. Ignore rigorosamente saldos acumulados, saldos parciais, saldos consolidados e dados informativos de cabeçalho.`;

        for (const model of openAiModels) {
          try {
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
              const list = extractJsonTransactions(content);
              if (Array.isArray(list) && list.length > 0) {
                parsedList = list;
                break;
              }
            }
          } catch (errModel: any) {
            console.warn(`[Netlify Function] Erro no modelo ${model}:`, errModel.message || errModel);
          }
        }
      } catch (openAiErr: any) {
        console.warn('[Netlify Function] Erro ao instanciar OpenAI:', openAiErr.message || openAiErr);
      }
    }

    // 2. SECONDARY FALLBACK: Google Gemini
    if ((!parsedList || parsedList.length === 0) && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
                break;
              }
            }
          } catch (geminiErr: any) {
            console.warn(`[Netlify Function] Erro no Gemini ${modelName}:`, geminiErr.message || geminiErr);
          }
        }
      } catch (geminiInitErr: any) {
        console.warn('[Netlify Function] Erro ao instanciar Gemini:', geminiInitErr.message || geminiInitErr);
      }
    }

    if (!parsedList || parsedList.length === 0) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: 'Não foi possível identificar transações no extrato enviado. Verifique se o arquivo contém movimentações financeiras legíveis.'
        })
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transactions })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Erro ao processar extrato bancário.'
      })
    };
  }
};
