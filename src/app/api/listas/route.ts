import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function getUserId(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

// GET: Buscar todas as listas com seus itens
export async function GET(req: Request) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const listas = await prisma.lista.findMany({
      where: { usuarioId },
      include: {
        itens: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(listas);
  } catch (error) {
    console.error('Erro ao buscar listas:', error);
    return NextResponse.json({ error: 'Erro ao buscar listas' }, { status: 500 });
  }
}

// POST: Criar nova lista
export async function POST(req: Request) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { nome } = await req.json();
    if (!nome) {
      return NextResponse.json({ error: 'Nome da lista é obrigatório' }, { status: 400 });
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
    console.error('Erro ao criar lista:', error);
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 });
  }
}