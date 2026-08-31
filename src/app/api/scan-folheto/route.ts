import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient, Regiao } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function normalizarRegiao(regiaoText: string): Regiao {
  const r = (regiaoText || '').toUpperCase();
  if (r.includes('NORTE')) return Regiao.NORTE;
  if (r.includes('NORDESTE')) return Regiao.NORDESTE;
  if (r.includes('CENTRO')) return Regiao.CENTRO_OESTE;
  if (r.includes('SUL') && !r.includes('SUDESTE')) return Regiao.SUL;
  return Regiao.SUDESTE;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    let usuarioId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        usuarioId = decoded.id;
      } catch (err) {
        console.warn('Scan sem usuário logado. Salvando como público.');
      }
    }

    const body = await req.json();
    const imagemBase64 = body.imagemBase64 || body.image || body.file;
    const mercado = body.mercado || body.supermercado || 'Mercado Geral';
    const regiaoEnum = normalizarRegiao(body.regiao || body.cidade || '');

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    // Modelo corrigido para versão compatível
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const base64Clean = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise este folheto do mercado ${mercado}.
Extraia todos os produtos com seus preços.
Retorne EXCLUSIVAMENTE um array JSON puro:
[{"produto": "Nome do Produto", "preco": 10.50}]`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Clean, mimeType: 'image/jpeg' } },
    ]);

    const rawText = result.response.text();
    let ofertasExtraidas: { produto: string; preco: number }[] = [];

    try {
      const jsonStart = rawText.indexOf('[');
      const jsonEnd = rawText.lastIndexOf(']') + 1;
      const cleanJson = rawText.substring(jsonStart, jsonEnd);
      ofertasExtraidas = JSON.parse(cleanJson);
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao interpretar dados do folheto.' }, { status: 422 });
    }

    if (!Array.isArray(ofertasExtraidas) || ofertasExtraidas.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto identificado.' }, { status: 422 });
    }

    // Gravação resiliente no Prisma
    const ofertasSalvas = [];
    for (const item of ofertasExtraidas) {
      const precoNum = parseFloat(String(item.preco).replace(',', '.')) || 0;
      const novaOferta = await prisma.oferta.create({
        data: {
          mercado,
          regiao: regiaoEnum,
          produto: item.produto || 'Produto Sem Nome',
          preco: precoNum,
          usuarioId: usuarioId,
        },
      });
      ofertasSalvas.push(novaOferta);
    }

    return NextResponse.json({
      success: true,
      totalProcessados: ofertasSalvas.length,
      itens: ofertasSalvas,
    });
  } catch (error: any) {
    console.error('Erro no scan-folheto:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar folheto.' }, { status: 500 });
  }
}