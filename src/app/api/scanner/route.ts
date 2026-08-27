import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa a API do Gemini com a chave de ambiente
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { imagemBase64, mercado, regiao } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json(
        { error: 'A imagem é obrigatória.' },
        { status: 400 }
      );
    }

    // Trata a string base64 removendo o prefixo data:image/...;base64,
    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imagemBase64.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

    // Chama o modelo Gemini Flash (ideal para leitura rápida de imagens e OCR)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Você é um especialista em extração de dados de folhetos de supermercado.
      Analise a imagem enviada e extraia todos os produtos e seus respectivos preços promocionais.
      
      Retorne estritamente um array JSON de objetos com o seguinte formato:
      [
        {
          "produto": "Nome do produto completo com marca e peso/volume se visível",
          "preco": 0.00
        }
      ]

      Regras:
      1. Extraia o preço em formato numérico decimal (ex: 12.99).
      2. Se o preço tiver centavos pequenos, junte no valor correto.
      3. Se não encontrar produtos ou a imagem estiver ilegível, retorne um array vazio [].
      4. Retorne APENAS o JSON puro, sem marcações Markdown de código como \`\`\`json.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    
    // Limpa eventuais marcadores de código Markdown se o modelo retornar
    const jsonLimpo = responseText.replace(/```json|```/g, '').trim();
    const ofertas = JSON.parse(jsonLimpo);

    // Retorna a resposta processada para o front-end
    return NextResponse.json({
      success: true,
      mercado: mercado || 'Não informado',
      regiao: regiao || 'SUDESTE',
      totalProcessados: ofertas.length,
      ofertas,
    });
  } catch (error: any) {
    console.error('Erro na API scan-folheto:', error);
    return NextResponse.json(
      { error: 'Falha ao processar a imagem com a IA.', detalhe: error.message },
      { status: 500 }
    );
  }
}