import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ITENS_PADRAO = [
  { id: 'std-1', nome: 'Arroz 5kg', quantidade: 1 },
  { id: 'std-2', nome: 'Feijão Carioca 1kg', quantidade: 1 },
  { id: 'std-3', nome: 'Óleo de Soja 900ml', quantidade: 1 },
  { id: 'std-4', nome: 'Açúcar Refinado 1kg', quantidade: 1 },
  { id: 'std-5', nome: 'Café Torrado 500g', quantidade: 1 },
  { id: 'std-6', nome: 'Leite Integral 1L', quantidade: 1 },
  { id: 'std-7', nome: 'Macarrão Espaguete 500g', quantidade: 1 },
  { id: 'std-8', nome: 'Detergente Líquido', quantidade: 1 },
  { id: 'std-9', nome: 'Sabão em Pó 1kg', quantidade: 1 },
  { id: 'std-10', nome: 'Papel Higiênico (12 un)', quantidade: 1 },
];

export async function GET() {
  try {
    const prismaAny = prisma as any;

    let lista = await prismaAny.lista.findFirst({
      include: { itens: true },
    });

    if (!lista) {
      lista = await prismaAny.lista.create({
        data: { nome: 'Minha Lista de Compras' },
        include: { itens: true },
      });
    }

    const itensBanco = (lista.itens || []).map((item: any) => ({
      id: item.id,
      nome: item.nome || item.produto || item.descricao || 'Produto',
      quantidade: item.quantidade || 1,
    }));

    // Concatena os itens padrão com os itens adicionados pelo usuário
    const todosItens = [...ITENS_PADRAO, ...itensBanco];

    return NextResponse.json({
      id: lista.id,
      nome: lista.nome || 'Minha Lista de Compras',
      itens: todosItens,
    });
  } catch (error) {
    console.error('Erro na rota GET de listas:', error);
    return NextResponse.json({
      id: 'default',
      nome: 'Minha Lista de Compras',
      itens: ITENS_PADRAO,
    });
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