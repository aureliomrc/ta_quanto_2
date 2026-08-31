import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const ITENS_PADRAO = [
  'Arroz 5kg',
  'Feijão Carioca 1kg',
  'Óleo de Soja 900ml',
  'Açúcar Refinado 1kg',
  'Café Torrado 500g',
  'Leite Integral 1L',
  'Macarrão Espaguete 500g',
  'Detergente Líquido 500ml',
  'Sabão em Pó 1kg',
  'Papel Higiênico (12 un)',
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

    // 1. Busca ou cria a lista principal
    let lista = await prismaAny.lista.findFirst({
      where: usuarioId ? { OR: [{ usuarioId }, { usuarioId: null }] } : undefined,
      include: { itens: true },
    });

    if (!lista) {
      lista = await prismaAny.lista.create({
        data: {
          nome: 'Minha Lista de Compras',
          usuarioId: usuarioId || null,
        },
      });
    }

    // 2. Garante que os 10 itens padrão existam no banco para essa lista
    const itensExistentes = await prismaAny.itemLista.findMany({
      where: { listaId: lista.id },
    });

    if (itensExistentes.length === 0) {
      for (const itemNome of ITENS_PADRAO) {
        try {
          await prismaAny.itemLista.create({
            data: {
              nome: itemNome,
              quantidade: 1,
              listaId: lista.id,
              usuarioId: null, // Visível para todos
            },
          });
        } catch {
          try {
            await prismaAny.itemLista.create({
              data: {
                produto: itemNome,
                quantidade: 1,
                listaId: lista.id,
                usuarioId: null,
              },
            });
          } catch (e) {
            console.error('Erro ao popular item padrão:', e);
          }
        }
      }
    }

    // 3. Busca todos os itens da lista (os padrão + os criados pelo usuário)
    const todosItens = await prismaAny.itemLista.findMany({
      where: {
        listaId: lista.id,
        ...(usuarioId ? { OR: [{ usuarioId: null }, { usuarioId }] } : {}),
      },
    });

    return NextResponse.json({
      id: lista.id,
      nome: lista.nome || 'Minha Lista de Compras',
      itens: todosItens,
    });
  } catch (error) {
    console.error('Erro na rota GET de listas:', error);

    // Fallback caso ocorra falha de conexão com o banco
    return NextResponse.json({
      id: 'default',
      nome: 'Minha Lista de Compras',
      itens: ITENS_PADRAO.map((nome, i) => ({
        id: String(i + 1),
        nome,
        quantidade: 1,
      })),
    });
  }
}

export async function POST(req: Request) {
  try {
    const usuarioId = getUserId(req);
    const { nome, listaId } = await req.json();
    const prismaAny = prisma as any;

    let targetListaId = listaId;
    if (!targetListaId) {
      const lista = await prismaAny.lista.findFirst();
      targetListaId = lista?.id;
    }

    let novoItem;
    try {
      novoItem = await prismaAny.itemLista.create({
        data: {
          nome,
          quantidade: 1,
          listaId: targetListaId,
          usuarioId: usuarioId || null,
        },
      });
    } catch {
      novoItem = await prismaAny.itemLista.create({
        data: {
          produto: nome,
          quantidade: 1,
          listaId: targetListaId,
          usuarioId: usuarioId || null,
        },
      });
    }

    return NextResponse.json(novoItem);
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    return NextResponse.json({ error: 'Erro ao adicionar item' }, { status: 500 });
  }
}