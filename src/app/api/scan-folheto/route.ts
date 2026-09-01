import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import jwt from 'jsonwebtoken';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const responseSchema: ResponseSchema = {
  type: SchemaType.ARRAY,
  description: 'Lista de produtos e preços em destaque',
  items: {
    type: SchemaType.OBJECT,
    properties: {
      produto: { type: SchemaType.STRING, description: 'Nome do produto' },
      preco: { type: SchemaType.NUMBER, description: 'Preço numérico' },
    },
    required: ['produto', 'preco'],
  },
};

export async function POST(req: Request) {
  // Inicia a contagem total
  console.time('⏱️ Tempo TOTAL da requisição');

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Você precisa estar logado.' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    // 1. Medir o tempo para receber a imagem do cliente
    console.time('📸 1. Receber e converter imagem');
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const mercado = (formData.get('mercado') as string) || 'Mercado';

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.timeEnd('📸 1. Receber e converter imagem');

    // Configuração do Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const prompt = `Liste até 15 produtos e preços visíveis da foto do mercado "${mercado}".`;

    // 2. Medir o tempo de resposta da API do Gemini
    console.time('🤖 2. Processamento IA (Gemini API)');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ]);
    console.timeEnd('🤖 2. Processamento IA (Gemini API)');

    const responseText = result.response.text();
    const ofertasExtraidas = JSON.parse(responseText);

    console.timeEnd('⏱️ Tempo TOTAL da requisição');

    return NextResponse.json({
      success: true,
      totalProcessados: ofertasExtraidas.length,
      itens: ofertasExtraidas,
    });
  } catch (error: any) {
    console.timeEnd('⏱️ Tempo TOTAL da requisição');
    console.error('Erro na extração:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem.' },
      { status: 500 }
    );
  }
}