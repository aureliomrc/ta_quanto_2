import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Traz todos os folhetos que são públicos (is_public = TRUE) OU que pertencem a qualquer usuário
    const historico = await sql`
      SELECT h.id, h.nome_lista, h.mercado, h.regiao, h.created_at,
             COUNT(i.id) as total_itens
      FROM historico_escaneamentos h
      LEFT JOIN historico_itens i ON h.id = i.historico_id
      WHERE h.is_public = TRUE OR h.is_public IS NULL
      GROUP BY h.id, h.nome_lista, h.mercado, h.regiao, h.created_at
      ORDER BY h.created_at DESC;
    `;

    return NextResponse.json({ success: true, historico });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}