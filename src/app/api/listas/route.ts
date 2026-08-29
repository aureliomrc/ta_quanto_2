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

    // Retorna a Lista Padrão (pública) + Listas criadas por este usuário específico
    const listas = await sql`
      SELECT * FROM listas 
      WHERE is_padrao = TRUE OR user_id = ${userId}
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
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    const { listaId, nomeItem, precoCustomizado, quantidade, categoria, nomeNovaLista } = await req.json();

    // 1. AÇÃO: Criar uma nova lista própria do usuário
    if (nomeNovaLista) {
      const [novaLista] = await sql`
        INSERT INTO listas (user_id, nome, is_padrao)
        VALUES (${decoded.id}, ${nomeNovaLista}, FALSE)
        RETURNING *;
      `;
      return NextResponse.json({ success: true, lista: novaLista });
    }

    // 2. AÇÃO: Acrescentar um item em qualquer lista (Padrão ou Criada)
    // O item fica associado ao user_id para não sobrecarregar outros usuários
    const [novoItem] = await sql`
      INSERT INTO itens_lista (lista_id, user_id, nome, preco_customizado, quantidade, categoria)
      VALUES (
        ${listaId},
        ${decoded.id},
        ${nomeItem},
        ${precoCustomizado ? Number(precoCustomizado) : null},
        ${quantidade || 1},
        ${categoria || 'Geral'}
      )
      RETURNING *;
    `;

    return NextResponse.json({ success: true, item: novoItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}