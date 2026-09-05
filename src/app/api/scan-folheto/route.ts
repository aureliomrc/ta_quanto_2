import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { Regiao } from '@prisma/client';
import jwt from 'jsonwebtoken';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave GEMINI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Você precisa estar logado.' }, { status: 401 });
    }

    let usuarioId = '';
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
      usuarioId = decoded.id;
    } catch {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mercado = (formData.get('mercado') as string) || 'Mercado Geral';
    const regiaoInput = (formData.get('regiao') as string) || 'SUDESTE';

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    }

    const mimeType = file.type || 'image/jpeg';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const prompt = `Extraia a lista de produtos e preços da foto do encarte do mercado "${mercado}".`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    const ofertasExtraidas = JSON.parse(responseText);

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    if (Array.isArray(ofertasExtraidas) && ofertasExtraidas.length > 0) {
      const ofertasParaInserir = ofertasExtraidas.map((item: any) => ({
        produto: String(item.produto),
        preco: Number(item.preco),
        mercado: mercado,
        regiao: regiaoInput as Regiao,
        origem: 'SCANNER' as const,
        usuarioId: usuarioId,
        expiresAt: expiresAt,
      }));

      await prisma.oferta.createMany({
        data: ofertasParaInserir,
      });
    }

    return NextResponse.json({
      success: true,
      totalProcessados: ofertasExtraidas.length,
      itens: ofertasExtraidas,
    });
  } catch (error: any) {
    console.error('Erro detalhado no Scanner:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao analisar imagem.' },
      { status: 500 }
    );
  }
}