import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { Regiao, OrigemOferta } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const responseSchema: ResponseSchema = {
  type: SchemaType.ARRAY,
  description: 'Lista de produtos e preços',
  items: {
    type: SchemaType.OBJECT,
    properties: {
      produto: { type: SchemaType.STRING },
      preco: { type: SchemaType.NUMBER },
    },
    required: ['produto', 'preco'],
  },
};

const model = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash',
  generationConfig: {
    temperature: 0.0,
    maxOutputTokens: 2048, // Aumentado para não cortar strings longas no meio
    responseMimeType: 'application/json',
    responseSchema: responseSchema,
  },
});

// Função resiliente para sanitizar e reparar JSON truncado
function extrairJSONRobusto(texto: string): any[] {
  let limpo = texto.trim();

  // Remove blocos de código Markdown
  if (limpo.startsWith('```')) {
    limpo = limpo.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  }

  const p = limpo.indexOf('[');
  const u = limpo.lastIndexOf(']');

  if (p !== -1 && u !== -1) {
    limpo = limpo.substring(p, u + 1);
  }

  // Primeira tentativa de parse padrão
  try {
    return JSON.parse(limpo);
  } catch (err) {
    // Se o JSON foi cortado no meio de um objeto/string, recupera os itens anteriores válidos
    const ultimoObjetoFechado = limpo.lastIndexOf('}');
    if (p !== -1 && ultimoObjetoFechado > p) {
      const jsonRecuperado = limpo.substring(p, ultimoObjetoFechado + 1) + ']';
      try {
        return JSON.parse(jsonRecuperado);
      } catch (innerErr) {
        throw new Error('Não foi possível ler a estrutura de ofertas da imagem.');
      }
    }
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    let usuarioId = '';
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
      usuarioId = decoded.id;
    } catch {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const { imagemBase64, mercado = 'Mercado', regiao = 'SUDESTE' } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem recebida.' }, { status: 400 });
    }

    let cleanBase64 = imagemBase64;
    let mimeType = 'image/jpeg';

    if (imagemBase64.includes(';base64,')) {
      const parts = imagemBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    // Requisição rápida ao Gemini
    const result = await model.generateContent([
      `Extraia ate 15 produtos e precos visiveis no folheto do mercado "${mercado}". Evite usar aspas dentro do nome do produto.`,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    const ofertasExtraidas = extrairJSONRobusto(responseText);

    // Gravação síncrona no Prisma com filtro de integridade
    if (Array.isArray(ofertasExtraidas) && ofertasExtraidas.length > 0) {
      const regiaoFormatada = String(regiao).replace(/-/g, '_').toUpperCase() as Regiao;
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const ofertasParaInserir = ofertasExtraidas
        .filter((item: any) => item && item.produto && !isNaN(Number(item.preco)))
        .map((item: any) => ({
          produto: String(item.produto).replace(/"/g, '').trim(),
          preco: Number(item.preco),
          mercado: String(mercado).trim(),
          regiao: regiaoFormatada,
          origem: OrigemOferta.SCANNER,
          usuarioId: usuarioId,
          expiresAt: expiresAt,
        }));

      if (ofertasParaInserir.length > 0) {
        try {
          await prisma.oferta.createMany({
            data: ofertasParaInserir,
          });
        } catch (dbErr: any) {
          console.error('Erro ao salvar no Prisma:', dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessados: ofertasExtraidas.length,
      itens: ofertasExtraidas,
    });
  } catch (error: any) {
    console.error('Erro na rota de scan:', error);
    return NextResponse.json(
      { error: `Erro na análise do Gemini: ${error.message || 'Falha ao processar imagem.'}` },
      { status: 500 }
    );
  }
}