import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { Regiao } from '@prisma/client';
import jwt from 'jsonwebtoken';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const responseSchema: ResponseSchema = {
  type: SchemaType.ARRAY,
  description: 'Lista com no máximo 15 produtos e preços em destaque',
  items: {
    type: SchemaType.OBJECT,
    properties: {
      produto: { type: SchemaType.STRING, description: 'Nome legível do produto' },
      preco: { type: SchemaType.NUMBER, description: 'Preço numérico promocional' },
    },
    required: ['produto', 'preco'],
  },
};

export async function POST(req: Request) {
  try {
    // 1. Validação rápida de Token
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

    // 2. Leitura dos dados multipart
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const mercado = (formData.get('mercado') as string) || 'Mercado Geral';

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Configuração ultra-rápida do Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1000, // Limita geração longa para cortar tempo de resposta
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    // Prompt focado apenas nos itens em destaque (reduz o tempo de geração de texto)
    const prompt = `Extraia no máximo 15 produtos e preços em maior destaque do mercado "${mercado}". Seja direto.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const responseText = result.response.text();
    const ofertasExtraidas = JSON.parse(responseText);

    // 4. Retorna direto para a tela sem perder tempo com inserção síncrona no banco
    return NextResponse.json({
      success: true,
      totalProcessados: ofertasExtraidas.length,
      itens: ofertasExtraidas,
    });
  } catch (error: any) {
    console.error('Erro na extração rápida:', error);
    return NextResponse.json(
      { error: 'Erro ao processar imagem. Tente uma foto com menos produtos.' },
      { status: 500 }
    );
  }
}