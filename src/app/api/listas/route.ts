import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

function generateCuid() {
  return 'c' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// GET: Retorna todas as listas padrão + listas do usuário logado com seus respectivos itens
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    let usuarioId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        usuarioId = decoded.id;
      } catch {}
    }

    // Busca as listas
    const listas = await sql`
      SELECT * FROM "Lista"
      WHERE "isPadrao" = TRUE OR "usuarioId" = ${usuarioId}
      ORDER BY "createdAt" DESC;
    `;

    // Busca os itens de todas essas listas
    const listaIds = listas.map((l: any) => l.id);
    let itens: any[] = [];
    
    if (listaIds.length > 0) {
      itens = await sql`
        SELECT * FROM "ItemLista"
        WHERE "listaId" = ANY(${listaIds});
      `;
    }

    // Agrupa os itens em suas respectivas listas
    const listasComItens = listas.map((lista: any) => ({
      ...lista,
      itens: itens.filter((item: any) => item.listaId === lista.id)
    }));

    return NextResponse.json({ success: true, listas: listasComItens });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Cria nova lista OU adiciona item a uma lista existente
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    const body = await req.json();

    const nomeNovaLista = body.nomeNovaLista || body.nomeLista || body.nome;
    const listaId = body.listaId || body.lista_id;
    const nomeItem = body.nomeItem || body.produto || body.item;
    const quantidade = parseInt(body.quantidade || 1);

    // -----------------------------------------------------------
    // CASO 1: CRIAR NOVA LISTA
    // -----------------------------------------------------------
    if (nomeNovaLista && !nomeItem) {
      const novaListaId = generateCuid();
      const [novaLista] = await sql`
        INSERT INTO "Lista" ("id", "nome", "isPadrao", "usuarioId", "createdAt")
        VALUES (${novaListaId}, ${nomeNovaLista}, FALSE, ${decoded.id}, NOW())
        RETURNING *;
      `;
      return NextResponse.json({ success: true, lista: novaLista });
    }

    // -----------------------------------------------------------
    // CASO 2: INCLUIR NOVO ITEM NA LISTA
    // -----------------------------------------------------------
    if (listaId && nomeItem) {
      const novoItemid = generateCuid();
      
      const [novoItem] = await sql`
        INSERT INTO "ItemLista" ("id", "listaId", "nome", "quantidade", "comprado")
        VALUES (${novoItemid}, ${listaId}, ${nomeItem}, ${quantidade}, FALSE)
        RETURNING *;
      `;

      return NextResponse.json({ success: true, item: novoItem });
    }

    return NextResponse.json({ error: 'Dados insuficientes. Informe o nome da lista ou o item e o listaId.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro em POST /api/listas:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}