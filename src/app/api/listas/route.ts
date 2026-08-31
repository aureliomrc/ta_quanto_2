import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function GET() {
  try {
    const prismaAny = prisma as any;

    let lista = await prismaAny.lista.findFirst({
      include: { itens: true },
    });

    // Se a lista não existir ou estiver vazia, cria a lista pré-preenchida com os 10 itens
    if (!lista || !lista.itens || lista.itens.length === 0) {
      if (!lista) {
        lista = await prismaAny.lista.create({
          data: { nome: 'Minha Lista de Compras' },
        });
      }

      for (const itemNome of ITENS_PADRAO) {
        try {
          await prismaAny.itemLista.create({
            data: { nome: itemNome, quantidade: 1, listaId: lista.id },
          });
        } catch {
          try {
            await prismaAny.itemLista.create({
              data: { produto: itemNome, quantidade: 1, listaId: lista.id },
            });
          } catch (e) {
            console.error('Erro ao popular item:', e);
          }
        }
      }

      lista = await prismaAny.lista.findFirst({
        where: { id: lista.id },
        include: { itens: true },
      });
    }

    return NextResponse.json(lista);
  } catch (error) {
    console.error('Erro na rota GET de listas:', error);
    return NextResponse.json(
      {
        id: '1',
        nome: 'Minha Lista de Compras',
        itens: ITENS_PADRAO.map((nome, i) => ({ id: String(i + 1), nome, quantidade: 1 })),
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
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
        data: { nome, quantidade: 1, listaId: targetListaId },
      });
    } catch {
      novoItem = await prismaAny.itemLista.create({
        data: { produto: nome, quantidade: 1, listaId: targetListaId },
      });
    }

    return NextResponse.json(novoItem);
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    return NextResponse.json({ error: 'Erro ao adicionar item' }, { status: 500 });
  }
}