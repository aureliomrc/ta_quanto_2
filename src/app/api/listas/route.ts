import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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

    const listas = await prisma.lista.findMany({
      where: {
        OR: [
          { isPadrao: true },
          { usuarioId: usuarioId ? usuarioId : undefined },
        ],
      },
      include: {
        itens: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, listas });
  } catch (err: any) {
    console.error('Erro ao buscar listas:', err);
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

    const nomeNovaLista = body.nomeNovaLista || body.nomeLista || body.nome;
    const listaId = body.listaId || body.lista_id;
    const nomeItem = body.nomeItem || body.produto || body.item;
    const quantidade = parseInt(body.quantidade || 1);

    // 1. CRIAR NOVA LISTA
    if (nomeNovaLista && !nomeItem) {
      const novaLista = await prisma.lista.create({
        data: {
          nome: nomeNovaLista,
          isPadrao: false,
          usuarioId: decoded.id,
        },
      });
      return NextResponse.json({ success: true, lista: novaLista });
    }

    // 2. INCLUIR ITEM NA LISTA
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
      { error: 'Envie nomeNovaLista para criar uma lista ou listaId + nomeItem para adicionar item.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Erro no POST /api/listas:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}