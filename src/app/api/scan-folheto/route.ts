import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { Regiao, OrigemOferta } from '@prisma/client';
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
    // 1. Validação do Token JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Você precisa estar logado.' }, { status: 401 });
    }

    let usuarioId = '';
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
      usuarioId = decoded.id;
    } catch (err: any) {
      return NextResponse.json({ error: `Sessão expirada ou inválida: ${err.message}` }, { status: 401 });
    }

    // 2. Leitura do Body
    const body = await req.json();
    const { imagemBase64, mercado = 'Mercado', regiao = 'SUDESTE' } = body;

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    // 3. Limpeza do Base64 e detecção do MIME Type
    let cleanBase64 = imagemBase64;
    let mimeType = 'image/jpeg';

    if (imagemBase64.includes(';base64,')) {
      const parts = imagemBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    // 4. Chamada à API do Gemini
    let ofertasExtraidas: any[] = [];
    try {
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
            data: cleanBase64,
            mimeType: mimeType,
          },
        },
      ]);

      const responseText = result.response.text();
      ofertasExtraidas = JSON.parse(responseText);
    } catch (geminiErr: any) {
      console.error('Erro Gemini:', geminiErr);
      return NextResponse.json(
        { error: `Erro na IA Gemini: ${geminiErr.message || 'Falha ao processar imagem.'}` },
        { status: 500 }
      );
    }

    // 5. Mapeamento e Inserção no Banco
    if (Array.isArray(ofertasExtraidas) && ofertasExtraidas.length > 0) {
      // Normalização da Região para evitar erro de enum (ex: CENTRO-OESTE -> CENTRO_OESTE)
      const regiaoFormatada = regiao.replace('-', '_').toUpperCase();

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const ofertasParaInserir = ofertasExtraidas.map((item: any) => ({
        produto: String(item.produto),
        preco: Number(item.preco),
        mercado: String(mercado),
        regiao: regiaoFormatada as Regiao,
        origem: OrigemOferta.SCANNER,
        usuarioId: usuarioId,
        expiresAt: expiresAt,
      }));

      try {
        await prisma.oferta.createMany({
          data: ofertasParaInserir,
        });
      } catch (prismaErr: any) {
        console.error('Erro Prisma:', prismaErr);
        return NextResponse.json(
          { error: `Erro ao salvar no banco: ${prismaErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessados: ofertasExtraidas.length,
      itens: ofertasExtraidas,
    });
  } catch (error: any) {
    console.error('Erro Não Tratado na Rota:', error);
    return NextResponse.json(
      { error: `Falha interna: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}