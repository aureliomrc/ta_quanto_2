import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('ERRO: GEMINI_API_KEY não configurada.');
      return NextResponse.json(
        { error: 'Chave da API do Gemini não configurada no servidor.' },
        { status: 500 }
      );
    }

    const { imagemBase64, mercado, regiao } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json(
        { error: 'A imagem é obrigatória.' },
        { status: 400 }
      );
    }

    // Remove o cabeçalho base64 data URL
    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imagemBase64.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Você é um leitor de folhetos de oferta. 
      Analise esta imagem e extraia todos os produtos com seus preços promocionais.
      
      Sua resposta deve ser EXCLUSIVAMENTE um JSON válido no seguinte formato:
      [
        {"produto": "Nome do Produto", "preco": 0.00}
      ]

      Regras estritas:
      - Converta o preço para número float (ex: R$ 8,49 vira 8.49).
      - Não adicione textos explicativos, markdown, nem blocos de código estilo \`\`\`json.
      - Retorne apenas o JSON puro.
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

    // Tratamento reforçado para extrair apenas o array JSON
    const jsonInicio = responseText.indexOf('[');
    const jsonFim = responseText.lastIndexOf(']') + 1;

    if (jsonInicio === -1 || jsonFim === 0) {
      throw new Error('Nenhum dado válido de oferta retornado pela IA.');
    }

    const jsonString = responseText.substring(jsonInicio, jsonFim);
    const ofertas = JSON.parse(jsonString);

    return NextResponse.json({
      success: true,
      mercado: mercado || 'Geral',
      regiao: regiao || 'SUDESTE',
      totalProcessados: ofertas.length,
      ofertas,
    });
  } catch (error: any) {
    console.error('Erro no processamento do scanner:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar a imagem do scanner.' },
      { status: 500 }
    );
  }
}