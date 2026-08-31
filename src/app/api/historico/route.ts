import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const prismaAny = prisma as any;
    const ofertas = await prismaAny.oferta.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(ofertas);
  } catch (error) {
    console.error('Erro ao buscar ofertas:', error);
    return NextResponse.json([], { status: 200 });
  }
}