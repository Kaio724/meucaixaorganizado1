import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
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

// Initialize Google GenAI
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

// API endpoint for bank statement parsing using Gemini
app.post('/api/importar-extrato', async (req, res) => {
  try {
    const { fileType, fileData } = req.body;

    if (!fileType || !fileData) {
      return res.status(400).json({ error: 'Parâmetros fileType e fileData são obrigatórios.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY não configurada no servidor.');
      return res.status(500).json({ error: 'Erro de configuração do servidor: chave de API não configurada.' });
    }

    console.log(`Iniciando análise de arquivo do tipo: ${fileType}`);

    let contents: any;

    if (fileType === 'pdf') {
      // Send base64 PDF directly to Gemini
      contents = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileData, // Base64 string of PDF
          },
        },
        {
          text: `Você é um especialista em contabilidade brasileira e análise de extratos bancários.
Analise com precisão absoluta o documento fornecido (extrato bancário em formato PDF).
Extraia TODAS as transações financeiras visíveis (entradas e saídas de recursos).

Para cada transação encontrada, determine:
1. Data (no formato YYYY-MM-DD. Se o extrato omitir o ano, assuma o ano atual ${new Date().getFullYear()}).
2. Título (nome amigável, limpo e direto da transação, ex: 'Uber', 'Netflix', 'PIX João Silva', 'Tarifa Bancária'). Remova códigos, IDs de transação poluídos ou termos técnicos desnecessários se possível, mas mantenha identificações cruciais.
3. Tipo: 'entrada' (para depósitos, créditos, recebimentos, PIX recebidos, rendimentos) ou 'saida' (para pagamentos, débitos, saques, compras, PIX enviados, tarifas, impostos).
4. Valor (número decimal positivo correspondente ao valor absoluto da transação, em Reais).
5. Forma de Pagamento (Classifique estritamente entre: 'Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência Bancária', 'Boleto', 'Outro'). Se for PIX recebido/enviado, use 'Pix'. Se for compra comum ou tarifa, tente classificar ou use 'Outro' ou 'Cartão de Crédito'/'Cartão de Débito' se houver essa indicação.
6. Categoria sugerida. Mapeie rigorosamente para uma destas categorias permitidas:
   Para entradas: 'Vendas', 'Serviços prestados', 'Aportes / Empréstimos', 'Rendimentos', 'Outras receitas'.
   Para saídas: 'Fornecedores', 'Insumos / Mercadorias', 'Aluguel / Condomínio / Luz / Água', 'Salários / Pró-labore', 'Ferramentas / Equipamentos', 'Marketing / Anúncios', 'Impostos / Taxas', 'Outras despesas'.
   Caso a transação não se encaixe com clareza em nenhuma delas, ou se tiver dúvida, use 'Não identificada'.
7. Indicador de Confiança da categoria: um número inteiro de 0 a 100 indicando o percentual de certeza da classificação da categoria (ex: Uber -> 'Outras despesas' ou 'Transporte' se estivesse disponível, mas como é 'Outras despesas', ou se for Netflix -> 'Outras despesas' com 95%). Se classificar como 'Não identificada', retorne 0.

Por favor, ignore saldos parciais, saldos consolidados ou outras informações do cabeçalho que não representem transações reais.`
        }
      ];
    } else if (fileType === 'text') {
      // Send extracted text to Gemini
      contents = `Você é um especialista em contabilidade brasileira e análise de dados brutos.
Abaixo está o conteúdo de texto extraído de um extrato financeiro (que pode ser CSV, Excel formatado, TXT ou similar):

--- INÍCIO DOS DADOS ---
${fileData}
--- FIM DOS DADOS ---

Analise com precisão absoluta as linhas de texto acima para identificar e extrair TODAS as transações financeiras individuais (entradas e saídas).

Para cada transação encontrada, determine:
1. Data (no formato YYYY-MM-DD. Se omitir o ano, assuma o ano atual ${new Date().getFullYear()}).
2. Título (nome amigável, limpo e direto da transação, ex: 'Uber', 'Netflix', 'PIX João Silva', 'Tarifa Bancária'). Remova códigos, IDs poluídos de transação ou termos técnicos desnecessários se possível, mas mantenha identificações cruciais.
3. Tipo: 'entrada' ou 'saida'.
4. Valor (número decimal positivo correspondente ao valor absoluto da transação, em Reais).
5. Forma de Pagamento (Classifique estritamente entre: 'Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência Bancária', 'Boleto', 'Outro').
6. Categoria sugerida. Mapeie rigorosamente para uma destas categorias permitidas:
   Para entradas: 'Vendas', 'Serviços prestados', 'Aportes / Empréstimos', 'Rendimentos', 'Outras receitas'.
   Para saídas: 'Fornecedores', 'Insumos / Mercadorias', 'Aluguel / Condomínio / Luz / Água', 'Salários / Pró-labore', 'Ferramentas / Equipamentos', 'Marketing / Anúncios', 'Impostos / Taxas', 'Outras despesas'.
   Caso a transação não se encaixe com clareza em nenhuma delas, ou se tiver dúvida, use 'Não identificada'.
7. Indicador de Confiança da categoria: um número inteiro de 0 a 100 indicando o percentual de certeza da classificação da categoria. Se for classificada como 'Não identificada', retorne 0.

Por favor, ignore saldos parciais, totais ou cabeçalhos que não correspondam a transações reais.`;
    } else {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado.' });
    }

    // Call Gemini with JSON schema output
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'A list of parsed financial transactions from the statement.',
          items: {
            type: Type.OBJECT,
            properties: {
              date: {
                type: Type.STRING,
                description: 'The date of the transaction in YYYY-MM-DD format.'
              },
              title: {
                type: Type.STRING,
                description: 'A clean and user-friendly name/title for the transaction.'
              },
              type: {
                type: Type.STRING,
                description: 'Must be either "entrada" (receipt/deposit) or "saida" (payment/expense).',
              },
              amount: {
                type: Type.NUMBER,
                description: 'The absolute positive monetary value of the transaction.'
              },
              paymentMethod: {
                type: Type.STRING,
                description: 'The payment method used. Must be one of: "Pix", "Dinheiro", "Cartão de Débito", "Cartão de Crédito", "Transferência Bancária", "Boleto", "Outro".'
              },
              category: {
                type: Type.STRING,
                description: 'The mapped category. Allowed values: Vendas, Serviços prestados, Aportes / Empréstimos, Rendimentos, Outras receitas, Fornecedores, Insumos / Mercadorias, Aluguel / Condomínio / Luz / Água, Salários / Pró-labore, Ferramentas / Equipamentos, Marketing / Anúncios, Impostos / Taxas, Outras despesas, Não identificada.'
              },
              confidence: {
                type: Type.INTEGER,
                description: 'The category classification confidence score, from 0 to 100.'
              }
            },
            required: ['date', 'title', 'type', 'amount', 'paymentMethod', 'category', 'confidence']
          }
        }
      }
    });

    const jsonText = response.text || '[]';
    console.log('Gemini respondeu com sucesso!');
    const transactions = JSON.parse(jsonText.trim());
    return res.json({ transactions });
  } catch (error: any) {
    console.error('Erro na rota de processamento:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar o extrato financeiro.' });
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
