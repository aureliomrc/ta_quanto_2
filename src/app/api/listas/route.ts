import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

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

    // Busca todas as listas públicas (isPadrao) OU criadas pelo usuário
    const listas = await prisma.lista.findMany({
      where: {
        OR: [
          { isPadrao: true },
          ...(usuarioId ? [{ usuarioId }] : []),
        ],
      },
      include: {
        itens: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, listas: listas || [] });
  } catch (err: any) {
    console.error('Erro GET /api/listas:', err);
    return NextResponse.json({ success: false, listas: [], error: err.message }, { status: 500 });
  }
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
      } catch {}
    }

    const body = await req.json();

    const nomeNovaLista = body.nomeNovaLista || body.nomeLista || body.nome;
    const listaId = body.listaId || body.lista_id || body.id;
    const nomeItem = body.nomeItem || body.produto || body.item || body.nome_item;
    const quantidade = parseInt(body.quantidade || 1);

    // 1. Criar Nova Lista
    if (nomeNovaLista && !listaId) {
      const novaLista = await prisma.lista.create({
        data: {
          nome: nomeNovaLista,
          isPadrao: !usuarioId,
          usuarioId: usuarioId,
        },
        include: {
          itens: true,
        },
      });
      return NextResponse.json({ success: true, lista: novaLista });
    }

    // 2. Adicionar Item na Lista
    if (listaId && nomeItem) {
      const novoItem = await prisma.itemLista.create({
        data: {
          listaId: listaId,
          nome: nomeItem,
          quantidade: quantidade,
          comprado: false,
        },
      });
      return NextResponse.json({ success: true, item: novoItem });
    }

    return NextResponse.json(
      { error: 'Parâmetros inválidos. Envie nomeNovaLista ou listaId + nomeItem.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Erro POST /api/listas:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}