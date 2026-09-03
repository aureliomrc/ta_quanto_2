import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { Regiao } from '@prisma/client';
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
  try {
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
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const mercado = (formData.get('mercado') as string) || 'Mercado Geral';
    const regiaoInput = (formData.get('regiao') as string) || 'SUDESTE';

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    }

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

    const prompt = `Liste até 15 produtos e preços visíveis da foto do mercado "${mercado}".`;

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

    // Expira em exatamente 72 horas a partir de agora
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Salva automaticamente as ofertas escaneadas no banco de dados
    if (Array.isArray(ofertasExtraidas) && ofertasExtraidas.length > 0) {
      await prisma.oferta.createMany({
        data: ofertasExtraidas.map((item: any) => ({
          produto: item.produto,
          preco: Number(item.preco),
          mercado: mercado,
          regiao: regiaoInput as Regiao,
          origem: 'SCANNER',
          usuarioId: usuarioId,
          expiresAt: expiresAt,
        })),
      }));
    }

    return NextResponse.json({
      success: true,
      totalProcessados: ofertasExtraidas.length,
      itens: ofertasExtraidas,
    });
  } catch (error: any) {
    console.error('Erro na extração:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem.' },
      { status: 500 }
    );
  }
}