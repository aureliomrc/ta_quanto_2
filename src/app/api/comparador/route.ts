import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Função de busca SEFAZ (Exemplo com API Menor Preço Brasil)
async function buscarPrecoMedioSefaz(termo: string, regiao: string) {
  try {
    // Exemplo de integração com a API da SEFAZ / Menor Preço
    // Em produção, adapte para o endpoint exato da SEFAZ da sua região
    const response = await axios.get(`https://menorpreco.notaparana.pr.gov.br/api/v1/produtos`, {
      params: { termo, limit: 5 }
    });
    
    if (response.data && response.data.produtos?.length > 0) {
      const soma = response.data.produtos.reduce((acc: number, item: any) => acc + item.preco, 0);
      return soma / response.data.produtos.length;
    }
    return 0;
  } catch (error) {
    return null; // Caso a API esteja inativa ou produto não encontrado
  }
}

export async function POST(req: Request) {
  try {
    const { listaId, regioesUsuario } = await req.json();

    const lista = await prisma.lista.findUnique({
      where: { id: listaId },
      include: { itens: { include: { produtoGenerico: true } } },
    });

    if (!lista) return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });

    const resultadoComparacao = await Promise.all(
      lista.itens.map(async (item) => {
        const nomeBusca = item.produtoGenerico?.nome || item.nomePersonalizado || '';

        // 1. Busca ofertas ativas enviadas por Crowdsourcing nas regiões do usuário
        const ofertasFolhetos = await prisma.oferta.findMany({
          where: {
            produto: { contains: nomeBusca, mode: 'insensitive' },
            regiao: { in: regioesUsuario },
            validade: { gte: new Date() }, // Oferta ainda válida
          },
          orderBy: { preco: 'asc' },
        });

        if (ofertasFolhetos.length > 0) {
          return {
            produto: nomeBusca,
            fonte: 'FOLHETO_CROWDSOURCING',
            menorPreco: ofertasFolhetos[0].preco,
            mercado: ofertasFolhetos[0].mercado,
            todasOfertas: ofertasFolhetos,
          };
        }

        // 2. Fallback: Se não houver folheto, busca a média na SEFAZ
        const precoMedioSefaz = await buscarPrecoMedioSefaz(nomeBusca, regioesUsuario[0]);

        return {
          produto: nomeBusca,
          fonte: 'SEFAZ_MEDIA',
          precoMedio: precoMedioSefaz || 'Indisponível',
          mercado: 'Média de Mercado (NFC-e)',
        };
      })
    );

    return NextResponse.json(resultadoComparacao);
  } catch (error) {
    return NextResponse.json({ error: 'Erro na comparação de preços' }, { status: 500 });
  }
}