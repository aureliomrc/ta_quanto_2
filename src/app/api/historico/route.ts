import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ofertas = await prisma.oferta.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({ success: true, historico: ofertas });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}