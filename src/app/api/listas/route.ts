import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const decoded = jwt.verify(token!, process.env.JWT_SECRET || 'secret') as { id: string };

    // Busca listas padrão (públicas) + listas do próprio usuário
    const listas = await sql`
      SELECT * FROM listas 
      WHERE is_padrao = TRUE OR user_id = ${decoded.id}
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
    const decoded = jwt.verify(token!, process.env.JWT_SECRET || 'secret') as { id: string };

    const { listaId, nomeItem, precoCustomizado, quantidade, categoria, nomeNovaLista } = await req.json();

    // Criar nova lista privada
    if (nomeNovaLista) {
      const [novaLista] = await sql`
        INSERT INTO listas (user_id, nome, is_padrao)
        VALUES (${decoded.id}, ${nomeNovaLista}, FALSE)
        RETURNING *;
      `;
      return NextResponse.json({ success: true, lista: novaLista });
    }

    // Adicionar item (seja na Lista Padrão ou Criada)
    // O item fica privado para o usuário que o adicionou!
    const [novoItem] = await sql`
      INSERT INTO itens_lista (lista_id, user_id, nome, preco_customizado, quantidade, categoria)
      VALUES (${listaId}, ${decoded.id}, ${nomeItem}, ${precoCustomizado || null}, ${quantidade || 1}, ${categoria || 'Geral'})
      RETURNING *;
    `;

    return NextResponse.json({ success: true, item: novoItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}