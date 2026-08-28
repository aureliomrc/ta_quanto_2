import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // 1. Validação do Token JWT no Header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Token de autenticação não fornecido.' }, { status: 401 });
    }

    let userId = '';
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
      userId = decoded.id;
    } catch {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { imagemBase64, mercado, regiao } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Imagem não informada.' }, { status: 400 });
    }

    // 2. Extração de ofertas com IA Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const base64Clean = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise este folheto de ofertas do mercado ${mercado} (${regiao}).
Extraia todos os produtos com seus respectivos preços visíveis.
Retorne APENAS um array JSON válido sem marcações markdown extra no formato:
[
  { "produto": "Nome do Produto", "preco": 10.90, "quantidade": 1, "categoria": "Mercearia" }
]`;

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
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const ofertas = JSON.parse(cleanedJson);

    if (!Array.isArray(ofertas) || ofertas.length === 0) {
      return NextResponse.json({ error: 'Nenhuma oferta identificada na imagem.' }, { status: 422 });
    }

    // 3. Salvar Histórico no Banco Neon
    const nomeLista = `Folheto ${mercado} (${regiao})`;
    const [historicoCriado] = await sql`
      INSERT INTO historico_escaneamentos (user_id, nome_lista, mercado, regiao)
      VALUES (${userId}, ${nomeLista}, ${mercado}, ${regiao})
      RETURNING id;
    `;

    // 4. Salvar Itens
    for (const item of ofertas) {
      await sql`
        INSERT INTO historico_itens (historico_id, nome, preco_capturado, quantidade, categoria)
        VALUES (
          ${historicoCriado.id},
          ${item.produto || item.nome || 'Produto Sem Nome'},
          ${Number(item.preco || item.precoOferta || 0)},
          ${item.quantidade || 1},
          ${item.categoria || 'Geral'}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      historicoId: historicoCriado.id,
      totalProcessados: ofertas.length,
    });
  } catch (error: any) {
    console.error('Erro ao processar folheto:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}