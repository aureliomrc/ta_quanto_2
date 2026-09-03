import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET: Lista histórico ativo (< 72h) do usuário
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

    const agora = new Date();

    // Limpeza automática dos itens com mais de 72h
    await prisma.oferta.deleteMany({
      where: {
        usuarioId: decoded.id,
        origem: 'SCANNER',
        expiresAt: { lt: agora },
      },
    });

    // Busca os itens válidos
    const historico = await prisma.oferta.findMany({
      where: {
        usuarioId: decoded.id,
        expiresAt: { gte: agora },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(historico);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
  }
}

// DELETE: Excluir um item específico do histórico
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do item é obrigatório' }, { status: 400 });

    await prisma.oferta.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Item excluído com sucesso' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro a excluir item' }, { status: 500 });
  }
}