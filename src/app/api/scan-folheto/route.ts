import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // Força a versão da API v1 e seleciona o modelo gemini-2.0-flash
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      { model: 'gemini-2.0-flash' },
      { apiVersion: 'v1' }
    );

    const prompt = `Você é um leitor especialista em folhetos de supermercado. 
    Analise a imagem e extraia todas as ofertas e preços.
    Retorne APENAS um array JSON puro e válido sem marcação Markdown ou bloco de código (\`\`\`json):
    [{"produto": "Nome do produto completo", "preco": 0.00}]`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const textResult = response.text();

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