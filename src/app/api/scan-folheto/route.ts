import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inicializa a SDK oficial do Gemini (certifique-se de ter GEMINI_API_KEY no seu .env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const { imagemBase64 } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json(
        { error: 'Nenhuma imagem foi fornecida.' },
        { status: 400 }
      );
    }

    // Extrai o tipo mime (png, jpeg, webp) e o buffer da string base64
    const matches = imagemBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: 'Formato de imagem base64 inválido.' },
        { status: 400 }
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Prompt adaptado para ler Folhetos, Etiquetas de Gôndola e Cartazes
    const prompt = `
Você é um sistema especialista em visão computacional e leitura de preços de supermercados.
Analise com atenção a imagem enviada. Ela pode ser:
1. Um folheto, encarte ou panfleto promocional impresso.
2. Uma foto de etiqueta de preço fixada na gôndola/prateleira do supermercado.
3. Um cartaz, banner ou etiqueta de oferta pendurada na gôndola.

Extraia as seguintes informações:
- Nome do supermercado (se legível ou presente na etiqueta/folheto; se não encontrar, coloque "Supermercado Local").
- Cidade/Região (se presente; se não encontrar, coloque "Não informada").
- Lista de todos os produtos visíveis com seus respectivos preços.

Sua resposta DEVE SER EXCLUSIVAMENTE um objeto JSON válido no formato abaixo, sem markdown de bloco de código (\`\`\`json) e sem explicações antes ou depois:

{
  "mercado": "Nome do Mercado",
  "regiao": "Região ou Cidade",
  "ofertas": [
    {
      "produto": "Nome do Produto (com peso/unidade se houver)",
      "preco": 10.90
    }
  ]
}
`;

    // Chamada à API da IA Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    const respostaTexto = response.text || '';

    // Limpa possíveis marcações markdown do retorno da IA para extrair apenas o JSON
    const jsonLimpo = respostaTexto
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const dadosExtraidos = JSON.parse(jsonLimpo);

    const mercado = dadosExtraidos.mercado || 'Supermercado Local';
    const regiao = dadosExtraidos.regiao || 'Não informada';
    const ofertasLidas = dadosExtraidos.ofertas || [];

    if (ofertasLidas.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível identificar preços ou produtos na imagem enviada.' },
        { status: 422 }
      );
    }

    // Grava as ofertas lidas no banco de dados via Prisma
    const ofertasSalvas = [];
    for (const item of ofertasLidas) {
      const precoNumerico = typeof item.preco === 'number' 
        ? item.preco 
        : parseFloat(String(item.preco).replace(',', '.'));

      if (item.produto && !isNaN(precoNumerico)) {
        const novaOferta = await prisma.oferta.create({
          data: {
            produto: item.produto,
            preco: precoNumerico,
            mercado: mercado,
            regiao: regiao,
          },
        });
        ofertasSalvas.push(novaOferta);
      }
    }

    return NextResponse.json({
      success: true,
      mercado,
      regiao,
      totalProcessados: ofertasSalvas.length,
      ofertas: ofertasSalvas,
    });

  } catch (error: any) {
    console.error('Erro ao processar imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a imagem do scanner.', detalhe: error.message },
      { status: 500 }
    );
  }
}