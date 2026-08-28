import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const decoded = jwt.verify(token!, process.env.JWT_SECRET || 'secret') as { id: string };

    const { listaId } = await req.json();

    // 1. Busca os itens da lista (Base da Lista + Itens adicionados pelo usuário)
    const itensLista = await sql`
      SELECT id, nome, preco_customizado, quantidade, categoria
      FROM itens_lista
      WHERE lista_id = ${listaId} AND (user_id IS NULL OR user_id = ${decoded.id});
    `;

    const resultadoComparacao = [];

    for (const item of itensLista) {
      // 2. Tenta buscar o preço capturado em folhetos ou gôndolas públicas
      const capturas = await sql`
        SELECT hi.preco_capturado, he.mercado, he.created_at
        FROM historico_itens hi
        JOIN historico_escaneamentos he ON hi.historico_id = he.id
        WHERE LOWER(hi.nome) LIKE LOWER(${'%' + item.nome + '%'})
          AND (he.is_public = TRUE OR he.user_id = ${decoded.id})
        ORDER BY he.created_at DESC
        LIMIT 1;
      `;

      if (capturas.length > 0) {
        resultadoComparacao.push({
          produto: item.nome,
          origem: 'Folheto / Gôndola',
          mercado: capturas[0].mercado,
          preco: Number(capturas[0].preco_capturado),
          quantidade: item.quantidade,
        });
      } else {
        // 3. Fallback: Se nunca foi extraído, calcula a Média SEFAZ histórica
        const mediaSefaz = await sql`
          SELECT AVG(preco_medio) as media_preco
          FROM tabela_sefaz_produtos
          WHERE LOWER(nome_produto) LIKE LOWER(${'%' + item.nome + '%'});
        `;

        const precoFinal = mediaSefaz[0]?.media_preco 
          ? Number(mediaSefaz[0].media_preco) 
          : (item.preco_customizado ? Number(item.preco_customizado) : 0.0);

        resultadoComparacao.push({
          produto: item.nome,
          origem: 'Média SEFAZ',
          mercado: 'Média de Mercado (SEFAZ)',
          preco: precoFinal,
          quantidade: item.quantidade,
        });
      }
    }

    return NextResponse.json({
      success: true,
      comparacao: resultadoComparacao,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}