import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const prismaAny = prisma as any;

    if (prismaAny.historicoFolheto) {
      // Busca todos os folhetos do banco de dados (sem filtrar por usuarioId)
      const historicos = await prismaAny.historicoFolheto.findMany({
        include: { itens: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(historicos);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error('Erro ao buscar histórico publico:', error);
    return NextResponse.json([], { status: 500 });
  }
}