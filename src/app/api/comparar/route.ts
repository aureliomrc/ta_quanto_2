import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Regiao, OrigemOferta } from '@prisma/client';
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
        // Token inválido/expirado
      }
    }

    const body = await req.json().catch(() => ({}));
    let { listaId, regiao } = body;

    if (!regiao) regiao = 'SUDESTE';

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

    const lista = (await prisma.lista.findUnique({
      where: { id: listaId },
      include: { itens: true } as any,
    })) as any;

    if (!lista) {
      return NextResponse.json({ error: 'Lista não encontrada.' }, { status: 400 });
    }

    const itensLista = lista.itens || lista.ItemLista || lista.produtos || [];

    if (itensLista.length === 0) {
      return NextResponse.json({ error: 'A lista está vazia.' }, { status: 400 });
    }

    // Busca todas as ofertas da região (tanto SCANNER quanto SEFAZ)
    const ofertas: any[] = await prisma.oferta.findMany({
      where: {
        regiao: regiao as Regiao,
        expiresAt: { gte: new Date() },
      },
    });

    const MERCADOS_PADRAO_REGIAO = ['Mercado A', 'Mercado B', 'Mercado C'];

    const itensComparados: ItemComparado[] = await Promise.all(
      itensLista.map(async (item: any) => {
        const nomeProduto = item.produto?.nome || item.nome || item.produtoNome || 'Produto';

        // 1. Filtra ofertas do scanner/folhetos para este item
        const ofertasEncontradas = ofertas.filter((of: any) =>
          String(of.produto || '').toLowerCase().includes(String(nomeProduto).toLowerCase())
        );

        // 2. Calcula a média real histórica/SEFAZ para esse produto específico no banco
        const agregacaoSefaz = await prisma.oferta.aggregate({
          _avg: { preco: true },
          where: {
            produto: { contains: nomeProduto, mode: 'insensitive' },
            origem: OrigemOferta.SEFAZ,
          },
        });

        // Se houver média da SEFAZ usa ela; caso contrário usa a média das ofertas extraídas do scanner
        const precoMedioSefaz =
          agregacaoSefaz._avg.preco ||
          (ofertasEncontradas.length > 0
            ? ofertasEncontradas.reduce((acc, o) => acc + Number(o.preco), 0) / ofertasEncontradas.length
            : 0);

        const ofertasFinais: ItemOferta[] = [];

        // Adiciona as ofertas reais encontradas no scanner (até 3)
        ofertasEncontradas.slice(0, 3).forEach((of) => {
          ofertasFinais.push({
            mercado: of.mercado,
            preco: Number(of.preco),
            origem: of.origem,
            mensagem: 'Oferta de Folheto',
          });
        });

        // 3. Garante que sempre existam 3 mercados na comparação
        let indexMercado = 0;
        while (ofertasFinais.length < 3) {
          const nomeMercadoFallback =
            MERCADOS_PADRAO_REGIAO[indexMercado] || `Mercado ${indexMercado + 1}`;

          if (!ofertasFinais.some((o) => o.mercado === nomeMercadoFallback)) {
            ofertasFinais.push({
              mercado: nomeMercadoFallback,
              preco: Number(precoMedioSefaz.toFixed(2)),
              origem: 'SEFAZ',
              mensagem: 'Média SEFAZ',
            });
          }
          indexMercado++;
        }

        return {
          produto: nomeProduto,
          quantidade: item.quantidade || 1,
          ofertas: ofertasFinais,
        };
      })
    );

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

      return { mercado, total: Number(total.toFixed(2)) };
    });

    return NextResponse.json({
      mercados: mercadosUnicos,
      itens: itensComparados,
      totais,
    });
  } catch (error: any) {
    console.error('Erro na comparação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar comparação.' },
      { status: 500 }
    );
  }
}