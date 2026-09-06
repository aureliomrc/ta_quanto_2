import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Regiao } from '@prisma/client';
import jwt from 'jsonwebtoken';

// GET: Lista histórico ativo (< 72h) GLOBAL de todos os usuários
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // Valida o token do usuário logado
    jwt.verify(token, process.env.JWT_SECRET || 'secret');

    const { searchParams } = new URL(req.url);
    const regiaoParam = searchParams.get('regiao');

    const agora = new Date();

    // 1. Limpeza automática global de itens expirados (> 72h)
    await prisma.oferta.deleteMany({
      where: {
        origem: 'SCANNER',
        expiresAt: { lt: agora },
      },
    });

    // 2. Monta a condição de busca
    const whereCondition: any = {
      expiresAt: { gte: agora },
    };

    // Se a região for enviada na query, filtra por ela
    if (regiaoParam) {
      const regiaoFormatada = regiaoParam.replace(/-/g, '_').toUpperCase() as Regiao;
      whereCondition.regiao = regiaoFormatada;
    }

    // 3. Busca GLOBAL de ofertas ativas de TODOS os usuários
    const historico = await prisma.oferta.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: {
          select: { id: true, nome: true }, // Retorna quem cadastrou/escaneou o produto
        },
      },
    });

    return NextResponse.json(historico);
  } catch (error: any) {
    console.error('Erro no GET histórico:', error);
    return NextResponse.json({ error: 'Erro ao buscar histórico público' }, { status: 500 });
  }
}

// DELETE: Permite excluir APENAS se o item pertencer ao usuário que está requisitando
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do item é obrigatório' }, { status: 400 });

    // Verifica se o item existe e se pertence ao usuário logado
    const ofertaExistente = await prisma.oferta.findUnique({
      where: { id },
    });

    if (!ofertaExistente) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    if (ofertaExistente.usuarioId !== decoded.id) {
      return NextResponse.json(
        { error: 'Você só pode excluir ofertas que você mesmo escaneou.' },
        { status: 403 }
      );
    }

    // Exclui o item do banco
    await prisma.oferta.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Item excluído com sucesso' });
  } catch (error: any) {
    console.error('Erro no DELETE histórico:', error);
    return NextResponse.json({ error: 'Erro ao excluir item' }, { status: 500 });
  }
}