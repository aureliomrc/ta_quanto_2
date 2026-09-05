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
  // Inicia a contagem total
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

    // 1. Medir o tempo para receber a imagem do cliente
    console.time('📸 1. Receber e converter imagem');
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const mercado = (formData.get('mercado') as string) || 'Mercado';
    const regiaoInput = (formData.get('regiao') as string) || 'SUDESTE';

    if (!file) {
      console.timeEnd('⏱️ Tempo TOTAL da requisição');
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

    // 3. Salvar no Banco de Dados (Prisma)
    console.time('💾 3. Salvando ofertas no banco');
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
    console.timeEnd('💾 3. Salvando ofertas no banco');

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