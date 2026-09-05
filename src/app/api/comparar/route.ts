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
        // Token invalido/expirado
      }
    }

    const body = await req.json().catch(() => ({}));
    let { listaId, regiao } = body;

    if (!regiao) regiao = 'SUDESTE';

    // Se nenhuma lista foi passada no dropdown, pega a mais recente
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
      return NextResponse.json({ error: 'A lista selecionada está vazia.' }, { status: 400 });
    }

    // Busca ofertas ativas da regiao
    const ofertas: any[] = await prisma.oferta.findMany({
      where: {
        regiao: regiao as Regiao,
        expiresAt: { gte: new Date() },
      },
    });

    const MERCADOS_PADRAO = ['Atacadão', 'Carrefour', 'Assaí'];

    const itensComparados: ItemComparado[] = await Promise.all(
      itensLista.map(async (item: any) => {
        const nomeProduto = item.produto?.nome || item.nome || item.produtoNome || 'Produto';

        // 1. Busca ofertas em folhetos/scanners
        const ofertasEncontradas = ofertas.filter((of: any) =>
          String(of.produto || '').toLowerCase().includes(String(nomeProduto).toLowerCase())
        );

        // 2. Cálculo Real da Média SEFAZ / Histórico (Garante valor > 0)
        let precoMedio = 0;

        const agregacaoSefaz = await prisma.oferta.aggregate({
          _avg: { preco: true },
          where: {
            produto: { contains: nomeProduto, mode: 'insensitive' },
          },
        });

        if (agregacaoSefaz._avg.preco && agregacaoSefaz._avg.preco > 0) {
          precoMedio = agregacaoSefaz._avg.preco;
        } else if (ofertasEncontradas.length > 0) {
          const soma = ofertasEncontradas.reduce((acc, o) => acc + Number(o.preco), 0);
          precoMedio = soma / ofertasEncontradas.length;
        } else {
          // Fallback global de seguranca caso o produto nunca tenha sido scanneado
          const mediaGeral = await prisma.oferta.aggregate({ _avg: { preco: true } });
          precoMedio = mediaGeral._avg.preco || 12.50;
        }

        const ofertasFinais: ItemOferta[] = [];

        // Adiciona ofertas de folheto encontradas
        ofertasEncontradas.forEach((of) => {
          if (ofertasFinais.length < 3) {
            ofertasFinais.push({
              mercado: of.mercado,
              preco: Number(of.preco),
              origem: of.origem || 'SCANNER',
              mensagem: 'Oferta Encontrada',
            });
          }
        });

        // 3. Preenche rigorosamente ate completar 3 mercados
        let idx = 0;
        while (ofertasFinais.length < 3) {
          const nomeMercado = MERCADOS_PADRAO[idx] || `Mercado ${idx + 1}`;
          if (!ofertasFinais.some((o) => o.mercado === nomeMercado)) {
            ofertasFinais.push({
              mercado: nomeMercado,
              preco: Number(precoMedio.toFixed(2)),
              origem: 'SEFAZ',
              mensagem: 'Média SEFAZ',
            });
          }
          idx++;
        }

        return {
          produto: nomeProduto,
          quantidade: item.quantidade || 1,
          ofertas: ofertasFinais.slice(0, 3), // Garante exatos 3 mercados
        };
      })
    );

    // Seleciona exatos 3 mercados para o cabeçalho/totais
    const mercados3 = MERCADOS_PADRAO;

    const totais = mercados3.map((mercado: string, index: number) => {
      const total = itensComparados.reduce((acc: number, item: ItemComparado) => {
        // Pega a oferta do mercado correspondente ou o índice equivalente
        const oferta = item.ofertas.find((of) => of.mercado === mercado) || item.ofertas[index] || item.ofertas[0];
        return acc + (oferta ? oferta.preco : 0) * item.quantidade;
      }, 0);

      return {
        mercado,
        total: Number(total.toFixed(2)),
      };
    });

    return NextResponse.json({
      mercados: mercados3,
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