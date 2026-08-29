import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    let userId = '';
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        userId = decoded.id;
      } catch {}
    }

    const { listaId } = await req.json();

    if (!listaId) {
      return NextResponse.json({ error: 'ID da lista é obrigatório.' }, { status: 400 });
    }

    // Traz itens base da lista selecionada + itens inseridos pelo próprio usuário
    const itensLista = await sql`
      SELECT id, nome, preco_customizado, quantidade, categoria
      FROM itens_lista
      WHERE lista_id = ${listaId} AND (user_id IS NULL OR user_id = ${userId});
    `;

    const resultadoComparacao = [];

    for (const item of itensLista) {
      // Procura primeiro nos folhetos e gôndolas públicas extraídas
      const capturas = await sql`
        SELECT hi.preco_capturado, he.mercado, he.created_at
        FROM historico_itens hi
        JOIN historico_escaneamentos he ON hi.historico_id = he.id
        WHERE LOWER(hi.nome) LIKE LOWER(${'%' + item.nome + '%'})
          AND (he.is_public = TRUE OR he.user_id = ${userId})
        ORDER BY he.created_at DESC
        LIMIT 1;
      `;

      if (capturas.length > 0) {
        resultadoComparacao.push({
          produto: item.nome,
          origem: 'Folheto / Extração',
          mercado: capturas[0].mercado,
          preco: Number(capturas[0].preco_capturado),
          quantidade: item.quantidade,
        });
      } else {
        // Fallback: Se nunca foi extraído, calcula a Média SEFAZ
        const mediaSefaz = await sql`
          SELECT AVG(preco_medio) as media_preco
          FROM tabela_sefaz_produtos
          WHERE LOWER(nome_produto) LIKE LOWER(${'%' + item.nome + '%'});
        `;

        const precoCalculado = mediaSefaz[0]?.media_preco 
          ? Number(mediaSefaz[0].media_preco)
          : (item.preco_customizado ? Number(item.preco_customizado) : 0);

        resultadoComparacao.push({
          produto: item.nome,
          origem: 'Média SEFAZ',
          mercado: 'Média Estadual SEFAZ',
          preco: precoCalculado,
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