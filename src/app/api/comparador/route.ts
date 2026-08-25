import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { listaId } = await req.json();

    // Se for a lista padrão em memória
    if (listaId === 'padrao') {
      const itensPadrao = [
        { id: 'p1', nome: 'Arroz 5kg', quantidade: 1 },
        { id: 'p2', nome: 'Feijão Carioca 1kg', quantidade: 2 },
        { id: 'p3', nome: 'Óleo de Soja 900ml', quantidade: 2 },
        { id: 'p4', nome: 'Leite Integral 1L', quantidade: 6 },
        { id: 'p5', nome: 'Açúcar Refinado 1kg', quantidade: 1 },
        { id: 'p6', nome: 'Café Torrado 500g', quantidade: 2 },
        { id: 'p7', nome: 'Sabão em Pó 1kg', quantidade: 1 },
      ];

      // Busca ofertas cadastradas no histórico para comparar
      const ofertas = await prisma.oferta.findMany();

      const comparacao = itensPadrao.map((item) => {
        const ofertasItem = ofertas.filter((o) =>
          o.produto.toLowerCase().includes(item.nome.toLowerCase())
        );
        return {
          produto: item.nome,
          quantidade: item.quantidade,
          ofertas: ofertasItem,
        };
      });

      return NextResponse.json({ comparacao });
    }

    // Busca a lista personalizada incluindo a relação de itens para evitar o erro do TypeScript
    const lista = await prisma.lista.findUnique({
      where: { id: listaId },
      include: {
        itens: true, // Adiciona o include para o Prisma retornar a relação 'itens'
      },
    });

    if (!lista) {
      return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
    }

    const ofertas = await prisma.oferta.findMany();

    // Tipagem correta do parâmetro 'item'
    const comparacao = lista.itens.map((item) => {
      const ofertasItem = ofertas.filter((o) =>
        o.produto.toLowerCase().includes(item.nome.toLowerCase())
      );
      return {
        produto: item.nome,
        quantidade: item.quantidade,
        ofertas: ofertasItem,
      };
    });

    return NextResponse.json({ comparacao });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao processar comparação' }, { status: 500 });
  }
}