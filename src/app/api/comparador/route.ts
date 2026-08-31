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
      return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 });
    }

    const mimeTypeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise a imagem deste folheto e extraia os produtos com seus preços. 
    Retorne EXCLUSIVAMENTE um array JSON no padrão: [{"produto": "Arroz 5kg", "preco": 24.90}]`;

    const imageParts = [{ inlineData: { data: base64Data, mimeType } }];
    const modelos = ['gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    
    let result = null;
    let ultimoErro = null;

    for (const nomeModelo of modelos) {
      try {
        const model = genAI.getGenerativeModel({ model: nomeModelo });
        result = await model.generateContent([prompt, ...imageParts]);
        if (result) break;
      } catch (err) {
        ultimoErro = err;
      }
    }

    if (!result) {
      throw ultimoErro || new Error('IA indisponível.');
    }

    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const produtos: { produto: string; preco: number }[] = JSON.parse(cleanedText);

    // Salva diretamente na tabela 'Oferta' para ficar disponível no banco
    if (produtos.length > 0) {
      const prismaAny = prisma as any;
      await prismaAny.oferta.createMany({
        data: produtos.map((p) => ({
          produto: String(p.produto).toUpperCase(),
          preco: Number(p.preco),
          mercado: mercado || 'Geral',
          regiao: regiao || 'SUDESTE',
          usuarioId: usuarioId || null,
        })),
      });
    }

    return NextResponse.json({ result: produtos });
  } catch (error: any) {
    console.error('Erro ao processar e salvar oferta:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao processar imagem.' }, { status: 500 });
  }
}