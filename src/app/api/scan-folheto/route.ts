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

// Função auxiliar para aguardar um determinado número de milissegundos
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Função auxiliar para sanitizar, extrair e reparar JSONs truncados ou com Markdown
function extrairETratarJSON(texto: string): any[] {
  let limpo = texto.trim();

  // 1. Remove blocos de código Markdown se houver
  if (limpo.startsWith('```json')) {
    limpo = limpo.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (limpo.startsWith('```')) {
    limpo = limpo.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // 2. Garante que pegamos apenas o array de produtos [...]
  const primeiroColchete = limpo.indexOf('[');
  const ultimoColchete = limpo.lastIndexOf(']');

  if (primeiroColchete !== -1 && ultimoColchete !== -1) {
    limpo = limpo.substring(primeiroColchete, ultimoColchete + 1);
  }

  try {
    return JSON.parse(limpo);
  } catch (err) {
    // 3. Tenta recuperar o JSON se a resposta foi cortada no final
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

    // 5. Chamada com Retry e Limpeza de Payload JSON
    let ofertasExtraidas: any[] = [];
    const maxTentativas = 3;
    let ultimoErro: any = null;

    // Utilizando um modelo estável com suporte multimodal (gemini-2.5-flash ou gemini-1.5-flash)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048, // Aumentado para 2048 para evitar truncamento de lista no meio
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const prompt = `Analise o folheto do mercado "${mercado}". Liste até 15 produtos e preços visíveis na imagem.`;

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
        
        // Tratamento e limpeza segura do JSON antes do JSON.parse
        ofertasExtraidas = extrairETratarJSON(responseText);

        // Se chegou até aqui com sucesso, interrompe o loop
        ultimoErro = null;
        break;
      } catch (geminiErr: any) {
        ultimoErro = geminiErr;
        const msg = geminiErr?.message || '';
        const eErroTemporario = 
          msg.includes('503') || 
          msg.includes('429') || 
          msg.includes('Service Unavailable') || 
          msg.includes('high demand') ||
          msg.includes('JSON');

        console.warn(`[Gemini Try ${tentativa}/${maxTentativas}] Falha ao processar: ${msg}`);

        if (eErroTemporario && tentativa < maxTentativas) {
          const tempoEspera = tentativa * 2000;
          console.log(`Aguardando ${tempoEspera / 1000}s para tentar novamente...`);
          await delay(tempoEspera);
        } else if (!eErroTemporario) {
          break;
        }
      }
    }

    // Se após todas as tentativas o erro persistir
    if (ultimoErro) {
      console.error('Erro Final no Gemini após tentativas:', ultimoErro);
      return NextResponse.json(
        { error: `Erro na análise do Gemini: Não foi possível processar o folheto. Tente uma foto mais nítida.` },
        { status: 500 }
      );
    }

    // 6. Salvando no Banco de Dados via Prisma
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