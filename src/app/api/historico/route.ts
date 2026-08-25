import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ofertas = await prisma.oferta.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ ofertas });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
  }
}