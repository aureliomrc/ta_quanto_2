import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { Regiao } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const responseSchema: ResponseSchema = {
  type: SchemaType.ARRAY,
  description: 'Lista de produtos e preços encontrados no folheto',
  items: {
    type: SchemaType.OBJECT,
    properties: {
      produto: { type: SchemaType.STRING, description: 'Nome do produto' },
      preco: { type: SchemaType.NUMBER, description: 'Preço numérico' },
    },
    required: ['produto', 'preco'],
  },
};

function normalizarRegiao(regiaoText: string): Regiao {
  const r = (regiaoText || '').toUpperCase();
  if (r.includes('NORTE') && !r.includes('NORDESTE')) return Regiao.NORTE;
  if (r.includes('NORDESTE')) return Regiao.NORDESTE;
  if (r.includes('CENTRO')) return Regiao.CENTRO_OESTE;
  if (r.includes('SUL') && !r.includes('SUDESTE')) return Regiao.SUL;
  return Regiao.SUDESTE;
}

export async function POST(req: Request) {
  try {
    // 1. Validação do Token JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    let usuarioId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        usuarioId = decoded.id;
      } catch {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Você precisa estar logado.' }, { status: 401 });
    }

    // 2. Leitura ultra-rápida via multipart FormData (sem string Base64 gigante)
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const mercado = (formData.get('mercado') as string) || 'Mercado Geral';
    const regiao = (formData.get('regiao') as string) || 'SUDESTE';

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    }

    // Converter Blob diretamente para Buffer sem parsing pesado
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Configurar modelo Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.0,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const prompt = `Extraia os produtos e preços promocionais do mercado "${mercado}". Ignore textos secundários.`;

    // 4. Chamada direta enviando o buffer comprimido
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
    let ofertasExtraidas: { produto: string; preco: number }[] = [];

    try {
      ofertasExtraidas = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: 'Não foi possível ler os produtos. Enquadre melhor a foto.' },
        { status: 422 }
      );
    }

    if (!Array.isArray(ofertasExtraidas) || ofertasExtraidas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum produto identificado nesta imagem.' },
        { status: 422 }
      );
    }

    // 5. Salvar no Banco
    const regiaoEnum = normalizarRegiao(regiao);
    const dadosParaInserir = ofertasExtraidas.map((item) => ({
      mercado: mercado,
      regiao: regiaoEnum,
      produto: item.produto || 'Produto Sem Nome',
      preco: Number(item.preco) || 0,
      usuarioId: usuarioId,
    }));

    await prisma.oferta.createMany({
      data: dadosParaInserir,
    });

    return NextResponse.json({
      success: true,
      totalProcessados: dadosParaInserir.length,
      itens: dadosParaInserir,
    });
  } catch (error: any) {
    console.error('Erro na rota scan-folheto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem.' },
      { status: 500 }
    );
  }
}