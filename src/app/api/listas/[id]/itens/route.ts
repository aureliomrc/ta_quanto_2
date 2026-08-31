import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listaId } = await params;
    const { nome, quantidade } = await req.json();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    if (!nome) {
      return NextResponse.json({ error: 'Nome do item é obrigatório' }, { status: 400 });
    }

    const novoItem = await prisma.itemLista.create({
      data: {
        nome,
        quantidade: quantidade || 1,
        listaId,
        usuarioId: decoded.id, // O item fica salvo no ID de quem adicionou
      },
    });

    return NextResponse.json(novoItem, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao adicionar item' }, { status: 500 });
  }
}