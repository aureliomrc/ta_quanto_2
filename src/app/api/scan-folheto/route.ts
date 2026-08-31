import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Regiao } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Função para mapear o texto retornado pelo select do frontend para o Enum do Prisma
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
    // 1. Extração do Token JWT do cabeçalho de Autorização
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    let usuarioId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        usuarioId = decoded.id;
      } catch (err) {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Você precisa estar logado.' }, { status: 401 });
    }

    // 2. Extração dos dados do formulário do frontend
    const { imagemBase64, mercado, regiao } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi capturada ou selecionada.' }, { status: 400 });
    }

    // 3. Configuração do modelo do Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.1 },
    });

    // Limpa o cabeçalho "data:image/jpeg;base64," da string do Canvas/Upload
    const base64Clean = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise este folheto de ofertas do mercado "${mercado || 'Supermercado'}".
Extraia todos os produtos e seus respectivos preços promocionais visible na imagem.
Retorne EXCLUSIVAMENTE um array JSON no seguinte formato (sem marcações de markdown extra):
[{"produto": "Nome do Produto", "preco": 10.50}]`;

    // 4. Envio da imagem em base64 para a API de visão
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
      const jsonStart = responseText.indexOf('[');
      const jsonEnd = responseText.lastIndexOf(']') + 1;
      const cleanJson = responseText.substring(jsonStart, jsonEnd);
      ofertasExtraidas = JSON.parse(cleanJson);
    } catch (e) {
      return NextResponse.json(
        { error: 'Não foi possível ler os produtos da imagem. Tente uma foto mais nítida.' },
        { status: 422 }
      );
    }

    if (!Array.isArray(ofertasExtraidas) || ofertasExtraidas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum produto com preço foi identificado nesta imagem.' },
        { status: 422 }
      );
    }

    // 5. Formatação para inserção na tabela do Neon via Prisma
    const regiaoEnum = normalizarRegiao(regiao);
    const dadosParaInserir = ofertasExtraidas.map((item) => ({
      mercado: mercado || 'Mercado Geral',
      regiao: regiaoEnum,
      produto: item.produto || 'Produto Sem Nome',
      preco: parseFloat(String(item.preco).replace(',', '.')) || 0,
      usuarioId: usuarioId,
    }));

    await prisma.oferta.createMany({
      data: dadosParaInserir,
    });

    // 6. Retorno no padrão esperado pelo componente frontend
    return NextResponse.json({
      success: true,
      totalProcessados: dadosParaInserir.length,
      itens: dadosParaInserir,
    });
  } catch (error: any) {
    console.error('Erro no processamento do folheto:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar folheto no servidor.' },
      { status: 500 }
    );
  }
}