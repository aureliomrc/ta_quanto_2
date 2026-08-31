import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// CADASTRO
export async function POST(req: Request) {
  try {
    const { nome, usuario, senha, regioes } = await req.json();

    const usuarioExiste = await prisma.usuario.findUnique({ where: { usuario } });
    if (usuarioExiste) {
      return NextResponse.json({ error: 'Usuário já existe' }, { status: 400 });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = await prisma.usuario.create({
      data: { nome, usuario, senha: senhaHash, regioes },
    });

    return NextResponse.json({ id: novoUsuario.id, usuario: novoUsuario.usuario }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar' }, { status: 500 });
  }
}

// LOGIN
export async function PUT(req: Request) {
  try {
    const { usuario, senha } = await req.json();
    const user = await prisma.usuario.findUnique({ where: { usuario } });

    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, regioes: user.regioes },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return NextResponse.json({ token, user: { id: user.id, nome: user.nome, regioes: user.regioes } });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao autenticar' }, { status: 500 });
  }
}