import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const listaId = params.id;
    const { nome, quantidade } = await req.json();

    if (!nome) {
      return NextResponse.json({ error: 'Nome do item é obrigatório' }, { status: 400 });
    }

    const novoItem = await prisma.itemLista.create({
      data: {
        nome,
        quantidade: quantidade || 1,
        listaId,
      },
    });

    return NextResponse.json(novoItem, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    return NextResponse.json({ error: 'Erro ao adicionar item' }, { status: 500 });
  }
}