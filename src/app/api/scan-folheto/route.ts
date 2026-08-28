import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave GEMINI_API_KEY não configurada no ambiente.' },
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

    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imagemBase64.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

    // Inicialização da instância Vertex AI com o ID do seu projeto
    const vertexAI = new VertexAI({
      project: '24430748795',
      location: 'us-central1',
    });

    // Instancia o modelo gemini-1.5-flash na Vertex AI
    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const prompt = `Você é um leitor especialista em folhetos de supermercado. 
    Analise a imagem e extraia todas as ofertas e preços.
    Retorne APENAS um array JSON puro e válido sem marcação Markdown ou bloco de código (\`\`\`json):
    [{"produto": "Nome do produto completo", "preco": 0.00}]`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    const resp = await generativeModel.generateContent(requestBody);
    const textResult = resp.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonInicio = textResult.indexOf('[');
    const jsonFim = textResult.lastIndexOf(']') + 1;

    if (jsonInicio === -1 || jsonFim === 0) {
      return NextResponse.json(
        { error: 'Nenhum produto foi identificado na imagem.' },
        { status: 422 }
      );
    }

    const jsonString = textResult.substring(jsonInicio, jsonFim);
    const ofertas = JSON.parse(jsonString);

    return NextResponse.json({
      success: true,
      mercado: mercado || 'Geral',
      regiao: regiao || 'SUDESTE',
      totalProcessados: ofertas.length,
      ofertas,
    });
  } catch (error: any) {
    console.error('Erro na rota scan-folheto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar a imagem.' },
      { status: 500 }
    );
  }
}