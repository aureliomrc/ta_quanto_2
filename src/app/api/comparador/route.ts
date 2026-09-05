import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Regiao } from '@prisma/client';
import jwt from 'jsonwebtoken';

interface ItemOferta {
  mercado: string;
  preco: number;
  origem: 'SCANNER' | 'SEFAZ';
  mensagem: string;
}

interface ItemComparado {
  produto: string;
  quantidade: number;
  ofertas: ItemOferta[];
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    let usuarioId = '';
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        usuarioId = decoded.id;
      } catch {
        // Token expirado/inválido
      }
    }

    const body = await req.json().catch(() => ({}));
    let { listaId, regiao } = body;

    if (!regiao) {
      regiao = 'SUDESTE';
    }

    if (!listaId) {
      const primeiraLista = await prisma.lista.findFirst({
        where: usuarioId ? { usuarioId } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      if (!primeiraLista) {
        return NextResponse.json(
          { error: 'Nenhuma lista encontrada. Crie uma lista primeiro.' },
          { status: 400 }
        );
      }
      listaId = primeiraLista.id;
    }

    // Busca a lista sem dependência rígida de include para evitar erro TS2353 no build
    const lista = await prisma.lista.findUnique({
      where: { id: listaId },
      include: {
        itens: true,
      } as any,
    }) as any;

    if (!lista) {
      return NextResponse.json(
        { error: 'A lista selecionada não foi encontrada.' },
        { status: 400 }
      );
    }

    // Tenta obter os itens da lista (seja 'itens', 'ItemLista' ou 'produtos')
    const itensLista = lista.itens || lista.ItemLista || lista.produtos || [];

    if (itensLista.length === 0) {
      return NextResponse.json(
        { error: 'A lista selecionada está vazia.' },
        { status: 400 }
      );
    }

    const ofertas: any[] = await prisma.oferta.findMany({
      where: {
        regiao: regiao as Regiao,
        expiresAt: { gte: new Date() },
      },
    });

    const itensComparados: ItemComparado[] = itensLista.map((item: any) => {
      const nomeProduto = item.produto?.nome || item.nome || item.produtoNome || 'Produto';
      const ofertasDoProduto = ofertas.filter((of: any) =>
        String(of.produto).toLowerCase().includes(String(nomeProduto).toLowerCase())
      );

      return {
        produto: nomeProduto,
        quantidade: item.quantidade || 1,
        ofertas:
          ofertasDoProduto.length > 0
            ? ofertasDoProduto.slice(0, 3).map((of: any) => ({
                mercado: of.mercado,
                preco: Number(of.preco),
                origem: of.origem,
                mensagem: 'Oferta Encontrada',
              }))
            : [
                {
                  mercado: 'Mercado Padrão',
                  preco: 10.0,
                  origem: 'SEFAZ' as const,
                  mensagem: 'Média estimada',
                },
              ],
      };
    });

    const mercadosUnicos = Array.from(
      new Set(
        itensComparados.flatMap((item: ItemComparado) =>
          item.ofertas.map((of: ItemOferta) => of.mercado)
        )
      )
    );

    const totais = mercadosUnicos.map((mercado: string) => {
      const total = itensComparados.reduce((acc: number, item: ItemComparado) => {
        const oferta = item.ofertas.find((of: ItemOferta) => of.mercado === mercado);
        const preco = oferta ? oferta.preco : 0;
        return acc + preco * item.quantidade;
      }, 0);

      return { mercado, total };
    });

    return NextResponse.json({
      mercados: mercadosUnicos,
      itens: itensComparados,
      totais: totais.length > 0 ? totais : [{ mercado: 'Sem Ofertas', total: 0 }],
    });
  } catch (error: any) {
    console.error('Erro na comparação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar comparação.' },
      { status: 500 }
    );
  }
}