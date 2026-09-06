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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extrairETratarJSON(texto: string): any[] {
  let limpo = texto.trim();

  // Remove formatação markdown se houver
  if (limpo.startsWith('```json')) {
    limpo = limpo.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (limpo.startsWith('```')) {
    limpo = limpo.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const primeiroColchete = limpo.indexOf('[');
  const ultimoColchete = limpo.lastIndexOf(']');

  if (primeiroColchete !== -1 && ultimoColchete !== -1) {
    limpo = limpo.substring(primeiroColchete, ultimoColchete + 1);
  }

  try {
    return JSON.parse(limpo);
  } catch (err) {
    if (!limpo.endsWith(']')) {
      const indiceUltimoObjetoFechado = limpo.lastIndexOf('}');
      if (indiceUltimoObjetoFechado !== -1) {
        const jsonReparado = limpo.substring(0, indiceUltimoObjetoFechado + 1) + ']';
        return JSON.parse(jsonReparado);
      }
    }
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    // 1. Validação JWT
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

    if (!apiKey) {
      return NextResponse.json({ error: 'Chave GEMINI_API_KEY não configurada no .env do servidor.' }, { status: 500 });
    }

    // 2. Leitura do Body
    const body = await req.json();
    const { imagemBase64, mercado = 'Mercado', regiao = 'SUDESTE' } = body;

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi recebida pelo servidor.' }, { status: 400 });
    }

    // 3. Processamento da imagem
    let cleanBase64 = imagemBase64;
    let mimeType = 'image/jpeg';

    if (imagemBase64.includes(';base64,')) {
      const parts = imagemBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    let ofertasExtraidas: any[] = [];
    const maxTentativas = 3;
    let ultimoErro: any = null;

    // Configurado com o modelo `gemini-3.6-flash`
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const prompt = `Analise a imagem do folheto do mercado "${mercado}". Identifique e extraia os produtos e seus respectivos preços. Retorne o resultado formatado como um array JSON.`;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
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
        ofertasExtraidas = extrairETratarJSON(responseText);

        ultimoErro = null;
        break;
      } catch (geminiErr: any) {
        ultimoErro = geminiErr;
        console.error(`[Erro Gemini 3.6 Tentativa ${tentativa}]:`, geminiErr?.message || geminiErr);

        if (tentativa < maxTentativas) {
          await delay(tentativa * 1500);
        }
      }
    }

    if (ultimoErro) {
      const detalheErro = ultimoErro.message || String(ultimoErro);
      return NextResponse.json(
        { error: `Erro na análise do Gemini: ${detalheErro}` },
        { status: 500 }
      );
    }

    // 4. Salvar no Banco via Prisma
    if (Array.isArray(ofertasExtraidas) && ofertasExtraidas.length > 0) {
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
    console.error('Erro Geral na Rota:', error);
    return NextResponse.json(
      { error: `Falha interna no servidor: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}