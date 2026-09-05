import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { Regiao, OrigemOferta } from '@prisma/client';
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
  console.time('⏱️ Tempo TOTAL da requisição');

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      console.timeEnd('⏱️ Tempo TOTAL da requisição');
      return NextResponse.json({ error: 'Você precisa estar logado.' }, { status: 401 });
    }

    let usuarioId = '';
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
      usuarioId = decoded.id;
    } catch {
      console.timeEnd('⏱️ Tempo TOTAL da requisição');
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    // Leitura dos dados em formato JSON enviada pelo Scanner.tsx
    const body = await req.json();
    const { imagemBase64, mercado = 'Mercado', regiao = 'SUDESTE' } = body;

    if (!imagemBase64) {
      console.timeEnd('⏱️ Tempo TOTAL da requisição');
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    // Remove o cabeçalho data:image/...;base64, se existir
    const cleanBase64 = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

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

    console.time('🤖 Processamento IA (Gemini API)');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      },
    ]);
    console.timeEnd('🤖 Processamento IA (Gemini API)');

    const responseText = result.response.text();
    const ofertasExtraidas = JSON.parse(responseText);

    console.time('💾 Salvando ofertas no banco');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    if (Array.isArray(ofertasExtraidas) && ofertasExtraidas.length > 0) {
      const ofertasParaInserir = ofertasExtraidas.map((item: any) => ({
        produto: String(item.produto),
        preco: Number(item.preco),
        mercado: mercado,
        regiao: regiao as Regiao,
        origem: OrigemOferta.SCANNER,
        usuarioId: usuarioId,
        expiresAt: expiresAt,
      }));

      await prisma.oferta.createMany({
        data: ofertasParaInserir,
      });
    }
    console.timeEnd('💾 Salvando ofertas no banco');

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
      { error: error.message || 'Falha ao processar imagem.' },
      { status: 500 }
    );
  }
}