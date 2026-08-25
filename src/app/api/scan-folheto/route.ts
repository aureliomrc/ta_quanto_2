import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient, Regiao } from '@prisma/client';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('imagem') as File;
    const mercado = (formData.get('mercado') as string) || 'Mercado Geral';
    const regiaoStr = (formData.get('regiao') as string) || 'SUDESTE';

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');

    // Chamada à API da Gemini com Vision
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image,
          },
        },
        `Extraia os produtos e seus respectivos preços deste folheto de mercado.
        Retorne APENAS um JSON no seguinte formato:
        {
          "produtos": [
            { "nome": "Nome do Produto", "preco": 10.50 }
          ]
        }`,
      ],
    });

    const text = response.text || '{}';
    const jsonLimpo = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const dadosExtraidos = JSON.parse(jsonLimpo);

    // Salva no banco de dados para criar o histórico
    if (dadosExtraidos.produtos && Array.isArray(dadosExtraidos.produtos)) {
      await Promise.all(
        dadosExtraidos.produtos.map((p: any) =>
          prisma.oferta.create({
            data: {
              mercado,
              regiao: regiaoStr as Regiao,
              produto: p.nome,
              preco: parseFloat(p.preco),
            },
          })
        )
      );
    }

    return NextResponse.json(dadosExtraidos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Falha no processamento da IA' }, { status: 500 });
  }
}