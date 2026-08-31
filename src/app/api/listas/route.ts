import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const ITENS_DIEESE = [
  'Arroz (3kg)',
  'Feijão (4,5kg)',
  'Carne Bovino (6kg)',
  'Leite Integral (7,5L)',
  'Pão Francês (6kg)',
  'Mandioca/Batata (6kg)',
  'Tomate (9kg)',
  'Óleo de Soja (1 lata/refil)',
  'Café em Pó (600g)',
  'Açúcar Refinado (3kg)',
  'Banana (9 dúzias)',
  'Manteiga (750g)',
  'Sabão em Pó (1kg)',
  'Detergente Líquido (500ml)',
];

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
    const prismaAny = prisma as any;

    // Busca listas do usuário e a lista padrão Dieese
    let listas = await prismaAny.lista.findMany({
      where: usuarioId ? { OR: [{ usuarioId }, { usuarioId: null }] } : { usuarioId: null },
      include: { itens: true },
      orderBy: { createdAt: 'asc' },
    });

    // Se a Lista Dieese original não existir no banco, cria ela com os 14 itens
    let listaDieese = listas.find((l: any) => l.nome === 'Lista Dieese' && l.usuarioId === null);

    if (!listaDieese) {
      listaDieese = await prismaAny.lista.create({
        data: {
          nome: 'Lista Dieese',
          usuarioId: null,
          itens: {
            create: ITENS_DIEESE.map((nome) => ({ nome, quantidade: 1 })),
          },
        },
        include: { itens: true },
      });
      listas.unshift(listaDieese);
    }

    return NextResponse.json(listas);
  } catch (error) {
    console.error('Erro ao buscar listas:', error);
    return NextResponse.json([
      {
        id: 'dieese-default',
        nome: 'Lista Dieese',
        itens: ITENS_DIEESE.map((nome, i) => ({ id: `d-${i}`, nome, quantidade: 1 })),
      },
    ]);
  }
}

// Criar Nova Lista Própria
export async function POST(req: Request) {
  try {
    const usuarioId = getUserId(req);
    const { nome } = await req.json();
    const prismaAny = prisma as any;

    const novaLista = await prismaAny.lista.create({
      data: {
        nome: nome || 'Nova Lista',
        usuarioId: usuarioId || null,
      },
      include: { itens: true },
    });

    return NextResponse.json(novaLista);
  } catch (error) {
    console.error('Erro ao criar lista:', error);
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 });
  }
}

// Manipulação de Itens da Lista (Adicionar, Alterar Qtd, Excluir Item)
export async function PUT(req: Request) {
  try {
    const usuarioId = getUserId(req);
    const { listaId, acao, itemId, nomeItem, quantidade } = await req.json();
    const prismaAny = prisma as any;

    let targetLista = await prismaAny.lista.findUnique({
      where: { id: listaId },
      include: { itens: true },
    });

    if (!targetLista) {
      return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
    }

    // SE A LISTA FOR A "LISTA DIEESE" PADRÃO E O USUÁRIO EDITAR, CRIA UMA CÓPIA PARA ELE (FORK)
    if (targetLista.usuarioId === null && targetLista.nome === 'Lista Dieese' && usuarioId) {
      targetLista = await prismaAny.lista.create({
        data: {
          nome: 'Lista Dieese (Minha Versão)',
          usuarioId,
          itens: {
            create: targetLista.itens.map((i: any) => ({
              nome: i.nome || i.produto,
              quantidade: i.quantidade,
            })),
          },
        },
        include: { itens: true },
      });
    }

    // Ações na lista ativa do usuário
    if (acao === 'ADD_ITEM') {
      await prismaAny.itemLista.create({
        data: {
          nome: nomeItem,
          quantidade: 1,
          listaId: targetLista.id,
          usuarioId: targetLista.usuarioId,
        },
      });
    } else if (acao === 'UPDATE_QTD') {
      const novaQtd = Math.max(1, quantidade);
      await prismaAny.itemLista.update({
        where: { id: itemId },
        data: { quantidade: novaQtd },
      });
    } else if (acao === 'DELETE_ITEM') {
      await prismaAny.itemLista.delete({
        where: { id: itemId },
      });
    }

    const listaAtualizada = await prismaAny.lista.findUnique({
      where: { id: targetLista.id },
      include: { itens: true },
    });

    return NextResponse.json(listaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar lista:', error);
    return NextResponse.json({ error: 'Erro ao processar alteração' }, { status: 500 });
  }
}

// Excluir Lista Inteira
export async function DELETE(req: Request) {
  try {
    const usuarioId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const listaId = searchParams.get('listaId');

    if (!listaId) {
      return NextResponse.json({ error: 'ID da lista obrigatório' }, { status: 400 });
    }

    const prismaAny = prisma as any;
    const lista = await prismaAny.lista.findUnique({ where: { id: listaId } });

    // Proteção: não exclui a Lista Dieese global padrão (somente as versões de usuário)
    if (lista && lista.usuarioId === null) {
      return NextResponse.json({ error: 'A Lista Dieese global não pode ser excluída.' }, { status: 400 });
    }

    await prismaAny.itemLista.deleteMany({ where: { listaId } });
    await prismaAny.lista.delete({ where: { id: listaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir lista:', error);
    return NextResponse.json({ error: 'Erro ao excluir lista' }, { status: 500 });
  }
}