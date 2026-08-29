import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { createId } from '@paralleldrive/cuid2'; // ou gerador de cuid simples

const sql = neon(process.env.DATABASE_URL!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Função aux para gerar CUID compatível se necessário
function generateCuid() {
  return 'c' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Normaliza o texto da região para o ENUM do PostgreSQL/Prisma
function normalizarRegiao(regiaoText: string): string {
  const r = (regiaoText || '').toUpperCase();
  if (r.includes('NORTE')) return 'NORTE';
  if (r.includes('NORDESTE')) return 'NORDESTE';
  if (r.includes('CENTRO')) return 'CENTRO_OESTE';
  if (r.includes('SUL') && !r.includes('SUDESTE')) return 'SUL';
  return 'SUDESTE'; // Padrão caso não identificada
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
        console.warn('Token inválido/ausente, salvando oferta sem usuário.');
      }
    }

    const body = await req.json();
    const imagemBase64 = body.imagemBase64 || body.image || body.file;
    const mercado = body.mercado || body.supermercado || 'Supermercado';
    const regiaoEnum = normalizarRegiao(body.regiao || body.cidade || '');

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi recebida.' }, { status: 400 });
    }

    // Instanciação com o modelo gemini-3.6-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const base64Clean = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise a imagem deste folheto do mercado ${mercado}.
Extraia todos os produtos com preços.
Retorne EXCLUSIVAMENTE um array JSON puro, sem blocos de código ou markdown:
[{"produto": "Nome do Produto", "preco": 10.50}]`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Clean, mimeType: 'image/jpeg' } },
    ]);

    const rawText = result.response.text();
    let ofertas: any[] = [];
    
    try {
      const jsonStart = rawText.indexOf('[');
      const jsonEnd = rawText.lastIndexOf(']') + 1;
      const cleanJson = rawText.substring(jsonStart, jsonEnd);
      ofertas = JSON.parse(cleanJson);
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao interpretar dados do folheto.' }, { status: 422 });
    }

    if (!Array.isArray(ofertas) || ofertas.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto identificado no folheto.' }, { status: 422 });
    }

    // GRAVA CADA PRODUTO NA TABELA "Oferta" DO SEU SCHEMA PRISMA
    const ofertasInseridas = [];
    for (const item of ofertas) {
      const nomeProduto = item.produto || item.nome || 'Produto Sem Nome';
      const precoProduto = parseFloat(item.preco || 0);
      const ofertaId = generateCuid();

      const [ofertaCriada] = await sql`
        INSERT INTO "Oferta" ("id", "mercado", "regiao", "produto", "preco", "usuarioId", "createdAt")
        VALUES (
          ${ofertaId},
          ${mercado},
          ${regiaoEnum}::"Regiao",
          ${nomeProduto},
          ${precoProduto},
          ${usuarioId},
          NOW()
        )
        RETURNING *;
      `;
      ofertasInseridas.push(ofertaCriada);
    }

    return NextResponse.json({
      success: true,
      totalProcessados: ofertasInseridas.length,
      itens: ofertasInseridas
    });
  } catch (error: any) {
    console.error('Erro no scan-folheto:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao salvar ofertas' }, { status: 500 });
  }
}