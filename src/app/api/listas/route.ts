import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ITENS_PADRAO = [
  { nome: 'Arroz 5kg', quantidade: 1 },
  { nome: 'Feijão Carioca 1kg', quantidade: 2 },
  { nome: 'Óleo de Soja 900ml', quantidade: 2 },
  { nome: 'Açúcar Refinado 1kg', quantidade: 1 },
  { nome: 'Café Torrado 500g', quantidade: 1 },
  { nome: 'Leite Integral 1L', quantidade: 6 },
  { nome: 'Macarrão Espaguete 500g', quantidade: 2 },
  { nome: 'Detergente Líquido', quantidade: 3 },
  { nome: 'Sabão em Pó 1kg', quantidade: 1 },
  { nome: 'Papel Higiênico (12 un)', quantidade: 1 },
];

export async function GET() {
  try {
    const prismaAny = prisma as any;

    let lista = await prismaAny.lista.findFirst({
      include: { itens: true },
    });

    if (!lista) {
      lista = await prismaAny.lista.create({
        data: {
          nome: 'Minha Lista de Compras',
          itens: {
            create: ITENS_PADRAO,
          },
        },
        include: { itens: true },
      });
    }

    return NextResponse.json(lista);
  } catch (error) {
    console.error('Erro na API de listas:', error);
    return NextResponse.json({ error: 'Erro ao carregar listas' }, { status: 500 });
  }
}