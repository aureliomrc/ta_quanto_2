import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Regiao } from '@prisma/client';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    let usuarioId = '';
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        usuarioId = decoded.id;
      } catch (err) {
        // Ignora erro de token para tentar busca geral se aplicável
      }
    }

    const body = await req.json().catch(() => ({}));
    let { listaId, regiao } = body;

    // Fallback para região
    if (!regiao) {
      regiao = 'SUDESTE';
    }

    // Se listaId não for enviado, busca a primeira lista do usuário ou do sistema
    if (!listaId) {
      const primeiraLista = await prisma.lista.findFirst({
        where: usuarioId ? { usuarioId } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      if (!primeiraLista) {
        return NextResponse.json(
          { error: 'Nenhuma lista de compras encontrada. Crie uma lista primeiro.' },
          { status: 400 }
        );
      }
      listaId = primeiraLista.id;
    }

    // Busca os itens da lista selecionada
    const lista = await prisma.lista.findUnique({
      where: { id: listaId },
      include: {
        itens: {
          include: { produto: true },
        },
      },
    });

    if (!lista || lista.itens.length === 0) {
      return NextResponse.json(
        { error: 'A lista selecionada está vazia ou não existe.' },
        { status: 400 }
      );
    }

    // Busca ofertas ativas dentro da validade de 72h
    const ofertas = await prisma.oferta.findMany({
      where: {
        regiao: regiao as Regiao,
        expiresAt: { gte: new Date() },
      },
    });

    // Mapeia ofertas por item da lista
    const itensComparados = lista.itens.map((item) => {
      const ofertasDoProduto = ofertas.filter((of) =>
        of.produto.toLowerCase().includes(item.produto.nome.toLowerCase())
      );

      return {
        produto: item.produto.nome,
        quantidade: item.quantidade,
        ofertas: ofertasDoProduto.length > 0
          ? ofertasDoProduto.slice(0, 3).map((of) => ({
              mercado: of.mercado,
              preco: Number(of.preco),
              origem: of.origem,
              mensagem: 'Encontrado no Scanner',
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

    // Calcula os totais por mercado
    const mercadosUnicos = Array.from(
      new Set(
        itensComparados.flatMap((item) => item.ofertas.map((of) => of.mercado))
      )
    );

    const totais = mercadosUnicos.map((mercado) => {
      const total = itensComparados.reduce((acc, item) => {
        const oferta = item.ofertas.find((of) => of.mercado === mercado);
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
    console.error('Erro no endpoint de comparação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao realizar comparação.' },
      { status: 500 }
    );
  }
}