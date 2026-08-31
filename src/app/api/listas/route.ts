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
  if (!authHeader || authHeader.includes('null') || authHeader.includes('undefined')) return null;
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

    // 1. Limpa todas as listas sem usuário que NÃO sejam a Lista Dieese original
    try {
      await prismaAny.lista.deleteMany({
        where: {
          usuarioId: null,
          nome: { not: 'Lista Dieese' },
        },
      });
    } catch (err) {
      console.warn('Aviso ao limpar listas antigas:', err);
    }

    // 2. Garante a existência da Lista Dieese Padrão Global
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
            create: ITENS_DIEESE.map((nome) => ({
              nome,
              quantidade: 1,
            })),
          },
        },
        include: { itens: true },
      });
    }

    // 3. Busca listas disponíveis para a sessão
    let listas = await prismaAny.lista.findMany({
      where: usuarioId ? { OR: [{ usuarioId }, { usuarioId: null }] } : { usuarioId: null },
      include: { itens: true },
      orderBy: { createdAt: 'asc' },
    });

    // Se o usuário já possui sua cópia da Lista Dieese, esconde a global
    if (usuarioId) {
      const possuiVersaoUsuario = listas.some(
        (l: any) => l.usuarioId === usuarioId && l.nome.includes('Dieese')
      );
      if (possuiVersaoUsuario) {
        listas = listas.filter((l: any) => !(l.usuarioId === null && l.nome === 'Lista Dieese'));
      }
    }

    return NextResponse.json(listas);
  } catch (error) {
    console.error('Erro na rota GET /api/listas:', error);
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
    const body = await req.json();
    const prismaAny = prisma as any;

    const novaLista = await prismaAny.lista.create({
      data: {
        nome: body.nome || 'Minha Lista',
        usuarioId,
      },
      include: { itens: true },
    });

    return NextResponse.json(novaLista);
  } catch (error) {
    console.error('Erro no POST /api/listas:', error);
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

    // SE A LISTA FOR A DIEESE GLOBAL E HOUVER QUALQUER EDIÇÃO (ADD, EDIT OU EXCLUIR ITEM):
    if (targetLista.usuarioId === null && targetLista.nome === 'Lista Dieese') {
      const itensExistentes = (targetLista.itens || []).map((i: any) => ({
        nome: i.nome || i.produto || i.descricao || 'Item',
        quantidade: i.quantidade || 1,
      }));

      // Se for inclusão de novo item, insere no array de criação da nova lista
      if (acao === 'ADD_ITEM' && nomeItem) {
        itensExistentes.push({
          nome: nomeItem,
          quantidade: 1,
        });
      }

      // Cria a nova versão da lista pertencente ao usuário
      const novaListaUsuario = await prismaAny.lista.create({
        data: {
          nome: 'Lista Dieese (Minha Versão)',
          usuarioId,
          itens: {
            create: itensExistentes,
          },
        },
        include: { itens: true },
      });

      return NextResponse.json(novaListaUsuario);
    }

    // AÇÕES PARA LISTAS PRÓPRIAS/EXISTENTES DO USUÁRIO
    if (acao === 'ADD_ITEM' && nomeItem) {
      try {
        await prismaAny.itemLista.create({
          data: {
            nome: nomeItem,
            quantidade: 1,
            listaId: targetLista.id,
          },
        });
      } catch {
        // Fallback para modelos que usam a propriedade 'produto' em vez de 'nome'
        await prismaAny.itemLista.create({
          data: {
            produto: nomeItem,
            quantidade: 1,
            listaId: targetLista.id,
          },
        });
      }
    } else if (acao === 'UPDATE_QTD' && itemId) {
      await prismaAny.itemLista.update({
        where: { id: itemId },
        data: { quantidade: Math.max(1, Number(quantidade) || 1) },
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
    console.error('Erro no PUT /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao processar item' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listaId = searchParams.get('listaId');

    if (!listaId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const prismaAny = prisma as any;
    const lista = await prismaAny.lista.findUnique({ where: { id: listaId } });

    if (lista && lista.usuarioId === null) {
      return NextResponse.json(
        { error: 'A Lista Dieese global original não pode ser deletada.' },
        { status: 400 }
      );
    }

    await prismaAny.itemLista.deleteMany({ where: { listaId } });
    await prismaAny.lista.delete({ where: { id: listaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no DELETE /api/listas:', error);
    return NextResponse.json({ error: 'Erro ao excluir lista' }, { status: 500 });
  }
}