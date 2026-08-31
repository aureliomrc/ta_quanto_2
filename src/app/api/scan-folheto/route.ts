import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Regiao } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

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
      } catch {}
    }

    const body = await req.json();
    const imagemBase64 = body.imagemBase64 || body.image || body.file;
    const mercado = body.mercado || body.supermercado || 'Mercado Geral';
    const regiaoEnum = normalizarRegiao(body.regiao || body.cidade || '');

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    // Configuração de resposta ultra-rápida
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        temperature: 0,
      },
    });

    const base64Clean = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Extraia produtos e preços deste folheto do mercado ${mercado}. Retorne apenas o array JSON puro: [{"produto":"nome","preco":0.00}]`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Clean, mimeType: 'image/jpeg' } },
    ]);

    const rawText = result.response.text();
    let ofertasExtraidas: { produto: string; preco: number }[] = [];

    try {
      const jsonStart = rawText.indexOf('[');
      const jsonEnd = rawText.lastIndexOf(']') + 1;
      ofertasExtraidas = JSON.parse(rawText.substring(jsonStart, jsonEnd));
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao formatar ofertas.' }, { status: 422 });
    }

    if (!Array.isArray(ofertasExtraidas) || ofertasExtraidas.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto identificado.' }, { status: 422 });
    }

    // Preparação dos dados para inserção rápida no banco
    const dadosParaInserir = ofertasExtraidas.map((item) => ({
      mercado,
      regiao: regiaoEnum,
      produto: item.produto || 'Produto Sem Nome',
      preco: parseFloat(String(item.preco).replace(',', '.')) || 0,
      usuarioId: usuarioId,
    }));

    // Inserção em massa ultrarrápida no Postgres (Neon)
    await prisma.oferta.createMany({
      data: dadosParaInserir,
    });

    return NextResponse.json({
      success: true,
      totalProcessados: dadosParaInserir.length,
      itens: dadosParaInserir,
    });
  } catch (error: any) {
    console.error('Erro no scan-folheto:', error);
    return NextResponse.json({ error: error.message || 'Erro no processamento.' }, { status: 500 });
  }
}