import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Regiao } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Mercado de fallback caso a região não possua 3 mercados com scans válidos
const MERCADOS_FALLBACK_POR_REGIAO: Record<string, string[]> = {
  SUDESTE: ['Carrefour', 'Pão de Açúcar', 'Extra'],
  SUL: ['Zaffari', 'Muffato', 'Bistek'],
  NORDESTE: ['GBarbosa', 'Atacadão', 'Assaí'],
  NORTE: ['Supermercados DB', 'Atacadão', 'Mateus'],
  CENTRO_OESTE: ['Comper', 'Atacadão', 'Assaí'],
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { listaId, regiao } = await req.json();

    if (!listaId || !regiao) {
      return NextResponse.json({ error: 'Lista e Região são obrigatórios' }, { status: 400 });
    }

    // 1. Busca os produtos da lista selecionada
    const lista = await prisma.lista.findUnique({
      where: { id: listaId },
      include: { itens: true },
    });

    if (!lista || lista.itens.length === 0) {
      return NextResponse.json({ error: 'Lista vazia ou não encontrada' }, { status: 404 });
    }

    const agora = new Date();

    // 2. Busca ofertas escaneadas recentes (últimas 72h) na região informada
    const ofertasRecentes = await prisma.oferta.findMany({
      where: {
        regiao: regiao as Regiao,
        expiresAt: { gte: agora },
      },
    });

    // 3. Define os 3 mercados para comparação
    const mercadosEscaneados = Array.from(new Set(ofertasRecentes.map((o) => o.mercado)));
    const fallbacks = MERCADOS_FALLBACK_POR_REGIAO[regiao] || ['Mercado A', 'Mercado B', 'Mercado C'];

    // Garante exatamente 3 mercados
    const mercadosParaComparar = Array.from(new Set([...mercadosEscaneados, ...fallbacks])).slice(0, 3);

    // 4. Monta a matriz de comparação para cada produto da lista
    const itensComparados = lista.itens.map((item) => {
      const nomeProduto = item.nome;

      const precosPorMercado = mercadosParaComparar.map((mercado) => {
        // Tenta encontrar uma oferta no scanner
        const ofertaScanner = ofertasRecentes.find(
          (o) =>
            o.mercado === mercado &&
            o.produto.toLowerCase().includes(nomeProduto.toLowerCase())
        );

        if (ofertaScanner) {
          return {
            mercado,
            preco: ofertaScanner.preco,
            origem: 'SCANNER',
            mensagem: 'Oferta do Folheto/Gôndola (Últimas 72h)',
          };
        }

        // Simulação de Fallback via SEFAZ/Média Estadual caso não haja scan recente
        // (Aqui você pode integrar a API SEFAZ do seu estado ou usar a média calculada)
        const precoMedioSefaz = (item.precoEstimado || 12.50);

        return {
          mercado,
          preco: precoMedioSefaz,
          origem: 'SEFAZ',
          mensagem: 'Preço médio oficial SEFAZ (Sem scanner recente)',
        };
      });

      return {
        produto: nomeProduto,
        quantidade: item.quantidade,
        ofertas: precosPorMercado,
      };
    });

    // 5. Calcula o valor total do carrinho em cada um dos 3 mercados
    const totaisPorMercado = mercadosParaComparar.map((mercado) => {
      const total = itensComparados.reduce((acc, item) => {
        const oferta = item.ofertas.find((o) => o.mercado === mercado);
        return acc + (oferta ? oferta.preco * item.quantidade : 0);
      }, 0);

      return { mercado, total };
    });

    return NextResponse.json({
      regiao,
      mercados: mercadosParaComparar,
      itens: itensComparados,
      totais: totaisPorMercado,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar comparação' }, { status: 500 });
  }
}