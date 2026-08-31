import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function getUserId(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const usuarioId = getUserId(req);
    const { imageBase64, mercado, regiao } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chave GEMINI_API_KEY não encontrada no servidor.' }, { status: 500 });
    }

    const mimeTypeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise a imagem deste folheto de ofertas e extraia os produtos com seus preços. 
    Retorne EXCLUSIVAMENTE um array JSON no padrão: [{"produto": "Nome do Produto", "preco": 10.90}]`;

    const imageParts = [{ inlineData: { data: base64Data, mimeType } }];

    const modelos = ['gemini-3.6-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'];
    let result = null;
    let ultimoErro = null;

    for (const nomeModelo of modelos) {
      try {
        const model = genAI.getGenerativeModel({ model: nomeModelo });
        result = await model.generateContent([prompt, ...imageParts]);
        if (result) break;
      } catch (err: any) {
        ultimoErro = err;
      }
    }

    if (!result) {
      throw ultimoErro || new Error('Servidores de IA indisponíveis.');
    }

    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const produtos: { produto: string; preco: number }[] = JSON.parse(cleanedText);

    // Salva no banco de dados se a tabela existir no prisma client
    if (usuarioId && produtos.length > 0) {
      try {
        const prismaAny = prisma as any;
        if (prismaAny.historicoFolheto) {
          await prismaAny.historicoFolheto.create({
            data: {
              usuarioId,
              mercado: mercado || 'Não informado',
              regiao: regiao || 'SUDESTE',
              itens: {
                create: produtos.map((p) => ({
                  produto: String(p.produto).toUpperCase(),
                  preco: Number(p.preco),
                })),
              },
            },
          });
        }
      } catch (dbError) {
        console.warn('Aviso: Não foi possível salvar no histórico (tabela Prisma ausente):', dbError);
      }
    }

    return NextResponse.json({ result: produtos });
  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar imagem.' },
      { status: 500 }
    );
  }
}