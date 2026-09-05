import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { Regiao, OrigemOferta } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
    // 1. Validação de Autenticação JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Você precisa estar logado para realizar esta operação.' }, { status: 401 });
    }

    let usuarioId = '';
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
      usuarioId = decoded.id;
    } catch (err: any) {
      return NextResponse.json({ error: `Sessão expirada ou token inválido: ${err.message}` }, { status: 401 });
    }

    // 2. Validação da Chave da API Gemini
    if (!apiKey) {
      return NextResponse.json({ error: 'Chave GEMINI_API_KEY não configurada no .env do servidor.' }, { status: 500 });
    }

    // 3. Leitura dos Dados Recebidos no Body
    const body = await req.json();
    const { imagemBase64, mercado = 'Mercado', regiao = 'SUDESTE' } = body;

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi recebida pelo servidor.' }, { status: 400 });
    }

    // 4. Limpeza da String Base64 e MIME Type
    let cleanBase64 = imagemBase64;
    let mimeType = 'image/jpeg';

    if (imagemBase64.includes(';base64,')) {
      const parts = imagemBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    // 5. Chamada para a API Gemini (gemini-2.0-flash)
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

      const prompt = `Liste até 15 produtos e preços visíveis na foto do folheto do mercado "${mercado}".`;

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
        { error: `Erro na análise do Gemini: ${geminiErr.message || 'Falha ao processar imagem.'}` },
        { status: 500 }
      );
    }

    // 6. Salvando no Banco de Dados via Prisma
    if (Array.isArray(ofertasExtraidas) && ofertasExtraidas.length > 0) {
      // Formata a região para garantir padrão Enum do Prisma (ex: CENTRO-OESTE -> CENTRO_OESTE)
      const regiaoFormatada = regiao.replace(/-/g, '_').toUpperCase();
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
          { error: `Erro ao salvar registros no banco: ${prismaErr.message}` },
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
    console.error('Erro Geral na Rota:', error);
    return NextResponse.json(
      { error: `Falha interna no servidor: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}