import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    let userId = '';

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        userId = decoded.id;
      } catch {}
    }

    // Retorna as Listas Padrão (públicas) E as listas do próprio usuário
    const listas = await sql`
      SELECT * FROM listas 
      WHERE is_padrao = TRUE OR user_id = ${userId} OR user_id IS NULL
      ORDER BY is_padrao DESC, created_at DESC;
    `;

    return NextResponse.json({ success: true, listas });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    const body = await req.json();

    // Aceita múltiplos nomes de parâmetros enviados do front-end
    const nomeNovaLista = body.nomeNovaLista || body.nomeLista || body.tituloLista;
    const listaId = body.listaId || body.lista_id;
    const nomeItem = body.nomeItem || body.nome || body.produto;
    const precoCustom = body.precoCustomizado || body.preco || body.preco_customizado;
    const qtd = body.quantidade || 1;
    const cat = body.categoria || 'Geral';

    // AÇÃO 1: CRIAR NOVA LISTA
    if (nomeNovaLista && !listaId && !nomeItem) {
      const [novaLista] = await sql`
        INSERT INTO listas (user_id, nome, is_padrao)
        VALUES (${decoded.id}, ${nomeNovaLista}, FALSE)
        RETURNING *;
      `;
      return NextResponse.json({ success: true, lista: novaLista });
    }

    // AÇÃO 2: INCLUIR NOVO ITEM NA LISTA (Padrão ou Privada)
    if (listaId && nomeItem) {
      const [novoItem] = await sql`
        INSERT INTO itens_lista (lista_id, user_id, nome, preco_customizado, quantidade, categoria)
        VALUES (
          ${parseInt(listaId)},
          ${decoded.id},
          ${nomeItem},
          ${precoCustom ? parseFloat(precoCustom) : null},
          ${parseInt(qtd)},
          ${cat}
        )
        RETURNING *;
      `;
      return NextResponse.json({ success: true, item: novoItem });
    }

    return NextResponse.json({ error: 'Dados insuficientes para criar lista ou adicionar item.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro na rota de listas:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
