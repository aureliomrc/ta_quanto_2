import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { Regiao } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Schema com tipagem estrita 'ResponseSchema' para passar no build do TypeScript
const responseSchema: ResponseSchema = {
  type: SchemaType.ARRAY,
  description: 'Lista de produtos e preços encontrados na imagem',
  items: {
    type: SchemaType.OBJECT,
    properties: {
      produto: { type: SchemaType.STRING, description: 'Nome do produto' },
      preco: { type: SchemaType.NUMBER, description: 'Preço promocional numérico' },
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

    // 2. Leitura dos dados recebidos
    const { imagemBase64, mercado, regiao } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi capturada.' }, { status: 400 });
    }

    // 3. Configuração do Gemini 2.5 Flash com schema fortemente tipado
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.0,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const base64Clean = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Extraia todos os produtos e preços visíveis da imagem/folheto do mercado "${mercado || 'Supermercado'}". Ignore textos decorativos.`;

    // 4. Chamada ultrarrápida da API
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Clean,
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
        { error: 'Não foi possível ler os produtos. Tente uma foto com melhor enquadramento.' },
        { status: 422 }
      );
    }

    if (!Array.isArray(ofertasExtraidas) || ofertasExtraidas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum produto com preço foi identificado nesta imagem.' },
        { status: 422 }
      );
    }

    // 5. Inserção no Banco de Dados
    const regiaoEnum = normalizarRegiao(regiao);
    const dadosParaInserir = ofertasExtraidas.map((item) => ({
      mercado: mercado || 'Mercado Geral',
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
    console.error('Erro no processamento do folheto:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar imagem no servidor.' },
      { status: 500 }
    );
  }
}