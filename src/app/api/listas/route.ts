import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function getUserId(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca ou cria a Lista Padrão global se não existir
    let listaPadrao = await prisma.lista.findFirst({
      where: { nome: 'LISTA PADRÃO' },
    });

    if (!listaPadrao) {
      listaPadrao = await prisma.lista.create({
        data: { nome: 'LISTA PADRÃO', usuarioId: null },
      });
    }

    // Busca as listas do usuário + a lista padrão
    const listas = await prisma.lista.findMany({
      where: {
        OR: [
          { usuarioId },
          { id: listaPadrao.id }
        ]
      },
      include: {
        itens: {
          where: { usuarioId } // Traz apenas os itens pertencentes a este usuário
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(listas);
  } catch (error) {
    console.error('Erro ao buscar listas:', error);
    return NextResponse.json({ error: 'Erro ao carregar listas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { nome } = await req.json();
    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const novaLista = await prisma.lista.create({
      data: {
        nome: nome.toUpperCase(),
        usuarioId,
      },
      include: { itens: true },
    });

    return NextResponse.json(novaLista, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 });
  }
}