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
  if (!authHeader || authHeader === 'Bearer null' || authHeader === 'Bearer undefined') return null;
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

    // 1. LIMPEZA AUTOMÁTICA: Remove qualquer lista antiga global sem dono que NÃO SEJA a "Lista Dieese"
    await prismaAny.lista.deleteMany({
      where: {
        usuarioId: null,
        nome: { not: 'Lista Dieese' },
      },
    });

    // 2. Garante que a Lista Dieese Global exista
    let listaDieeseGlobal = await prismaAny.lista.findFirst({
      where: { nome: 'Lista Dieese', usuarioId: null },
      include: { itens: true },
    });

    if (!listaDieeseGlobal) {
      listaDieeseGlobal = await prismaAny.lista.create({
        data: {
          nome: 'Lista Dieese',
          usuarioId: null,
          itens: {
            create: ITENS_DIEESE.map((nome) => ({ nome, quantidade: 1 })),
          },
        },
        include: { itens: true },
      });
    }

    // 3. Busca listas
    let listas = await prismaAny.lista.findMany({
      where: usuarioId ? { OR: [{ usuarioId }, { usuarioId: null }] } : { usuarioId: null },
      include: { itens: true },
      orderBy: { createdAt: 'asc' },
    });

    // Se o usuário tem uma versão própria da Lista Dieese, remove a versão global da visualização dele
    if (usuarioId) {
      const temVersaoPropria = listas.some(
        (l: any) => l.usuarioId === usuarioId && l.nome.includes('Dieese')
      );
      if (temVersaoPropria) {
        listas = listas.filter((l: any) => !(l.usuarioId === null && l.nome === 'Lista Dieese'));
      }
    }

    return NextResponse.json(listas);
  } catch (error) {
    console.error('Erro ao buscar listas:', error);
    return NextResponse.json([
      {
        id: 'dieese-default',
        nome: 'Lista Dieese',
        usuarioId: null,
        itens: ITENS_DIEESE.map((nome, i) => ({ id: `d-${i}`, nome, quantidade: 1 })),
      },
    ]);
  }
}

export async function POST(req: Request) {
  try {
    const usuarioId = getUserId(req) || 'guest-user';
    const { nome } = await req.json();
    const prismaAny = prisma as any;

    const novaLista = await prismaAny.lista.create({
      data: {
        nome: nome || 'Minha Lista',
        usuarioId,
      },
      include: { itens: true },
    });

    return NextResponse.json(novaLista);
  } catch (error) {
    console.error('Erro ao criar lista:', error);
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const usuarioId = getUserId(req) || 'guest-user';
    const { listaId, acao, itemId, nomeItem, quantidade } = await req.json();
    const prismaAny = prisma as any;

    let targetLista = await prismaAny.lista.findUnique({
      where: { id: listaId },
      include: { itens: true },
    });

    if (!targetLista) {
      return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
    }

    // SE ESTIVER NAVEGANDO NA LISTA DIEESE GLOBAL E EDITAR:
    // Transforma essa alteração em uma NOVA LISTA do usuário imediatamente
    if (targetLista.usuarioId === null && targetLista.nome === 'Lista Dieese') {
      const novosItens = (targetLista.itens || []).map((i: any) => ({
        nome: i.nome || i.produto || i.descricao,
        quantidade: i.quantidade || 1,
      }));

      // Se a ação for adicionar item, adiciona ao payload da nova lista
      if (acao === 'ADD_ITEM' && nomeItem) {
        novosItens.push({ nome: nomeItem, quantidade: 1 });
      }

      targetLista = await prismaAny.lista.create({
        data: {
          nome: 'Lista Dieese (Minha Versão)',
          usuarioId,
          itens: {
            create: novosItens,
          },
        },
        include: { itens: true },
      });

      // Se já adicionou no array ao criar a lista, retorna direto
      if (acao === 'ADD_ITEM') {
        return NextResponse.json(targetLista);
      }
    }

    // Executa alterações para listas normais
    if (acao === 'ADD_ITEM' && nomeItem) {
      await prismaAny.itemLista.create({
        data: {
          nome: nomeItem,
          quantidade: 1,
          listaId: targetLista.id,
          usuarioId: targetLista.usuarioId,
        },
      });
    } else if (acao === 'UPDATE_QTD' && itemId) {
      await prismaAny.itemLista.update({
        where: { id: itemId },
        data: { quantidade: Math.max(1, quantidade) },
      });
    } else if (acao === 'DELETE_ITEM' && itemId) {
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listaId = searchParams.get('listaId');

    if (!listaId) {
      return NextResponse.json({ error: 'ID da lista é obrigatório' }, { status: 400 });
    }

    const prismaAny = prisma as any;
    const lista = await prismaAny.lista.findUnique({ where: { id: listaId } });

    if (lista && lista.usuarioId === null) {
      return NextResponse.json({ error: 'A Lista Dieese padrão global não pode ser excluída.' }, { status: 400 });
    }

    await prismaAny.itemLista.deleteMany({ where: { listaId } });
    await prismaAny.lista.delete({ where: { id: listaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir lista:', error);
    return NextResponse.json({ error: 'Erro ao excluir lista' }, { status: 500 });
  }
}