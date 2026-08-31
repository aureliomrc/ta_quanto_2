import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ofertas = await prisma.oferta.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({ 
      success: true, 
      historico: ofertas || [] 
    });
  } catch (err: any) {
    console.error('Erro ao buscar histórico:', err);
    return NextResponse.json({ 
      success: false, 
      historico: [], 
      error: err.message || 'Erro ao carregar histórico.' 
    }, { status: 200 });
  }
}