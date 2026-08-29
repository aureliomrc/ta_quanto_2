import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    let userId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        userId = decoded.id;
      } catch (err) {
        console.warn('Token inválido ou ausente, salvando como usuário anônimo.');
      }
    }

    const body = await req.json();
    const imagemBase64 = body.imagemBase64 || body.image || body.file;
    const mercado = body.mercado || body.supermercado || 'Supermercado';
    const regiao = body.regiao || body.cidade || 'Geral';

    if (!imagemBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi recebida pelo servidor.' }, { status: 400 });
    }

    // Instanciação com gemini-3.6-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const base64Clean = imagemBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise a imagem deste folheto do mercado ${mercado}.
Extraia todos os produtos com preços.
Retorne EXCLUSIVAMENTE um array JSON puro, sem blocos de código ou textos adicionais, com o formato:
[{"produto": "Nome", "preco": 10.50, "quantidade": 1, "categoria": "Mercearia"}]`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Clean, mimeType: 'image/jpeg' } },
    ]);

    const rawText = result.response.text();
    
    // Tratamento de extração segura do JSON do Gemini
    let ofertas: any[] = [];
    try {
      const jsonStart = rawText.indexOf('[');
      const jsonEnd = rawText.lastIndexOf(']') + 1;
      const cleanJson = rawText.substring(jsonStart, jsonEnd);
      ofertas = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Erro ao fazer parse do JSON do Gemini:', rawText);
      return NextResponse.json({ error: 'Não foi possível interpretar a resposta visual do folheto.' }, { status: 422 });
    }

    if (!Array.isArray(ofertas) || ofertas.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto foi identificado no folheto.' }, { status: 422 });
    }

    // 1. GRAVA O CABEÇALHO DO ESCANEAMENTO COMO PÚBLICO (is_public = TRUE)
    const nomeLista = `Folheto ${mercado} (${regiao})`;
    const [historicoCriado] = await sql`
      INSERT INTO historico_escaneamentos (user_id, nome_lista, mercado, regiao, is_public)
      VALUES (${userId}, ${nomeLista}, ${mercado}, ${regiao}, TRUE)
      RETURNING id;
    `;

    // 2. GRAVA CADA ITEM EXTRAÍDO NO BANCO NEON
    for (const item of ofertas) {
      const nomeProd = item.produto || item.nome || item.descricao || 'Produto Extraído';
      const precoProd = parseFloat(item.preco || item.precoOferta || item.valor || 0);
      const qtdProd = parseInt(item.quantidade || 1);
      const catProd = item.categoria || 'Geral';

      await sql`
        INSERT INTO historico_itens (historico_id, nome, preco_capturado, quantidade, categoria)
        VALUES (${historicoCriado.id}, ${nomeProd}, ${precoProd}, ${qtdProd}, ${catProd});
      `;
    }

    return NextResponse.json({
      success: true,
      historicoId: historicoCriado.id,
      totalProcessados: ofertas.length,
      itens: ofertas
    });
  } catch (error: any) {
    console.error('Erro detalhado no scan-folheto:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor ao salvar folheto' }, { status: 500 });
  }
}