import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    const userId = decoded.id;

    const escaneamentos = await sql`
      SELECT id, nome_lista as "nomeLista", mercado as "mercadoCapturado", 
             to_char(criado_em, 'DD/MM/YYYY - HH24:MI') as data
      FROM historico_escaneamentos
      WHERE user_id = ${userId}
      ORDER BY criado_em DESC;
    `;

    const historicoCompleto = await Promise.all(
      escaneamentos.map(async (esc) => {
        const itens = await sql`
          SELECT id, nome, CAST(preco_capturado AS FLOAT) as "precoCapturado", quantidade, categoria
          FROM historico_itens
          WHERE historico_id = ${esc.id};
        `;
        return {
          ...esc,
          totalItens: itens.length,
          itens,
        };
      })
    );

    return NextResponse.json(historicoCompleto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}