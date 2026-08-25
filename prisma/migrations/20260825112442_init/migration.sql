-- CreateEnum
CREATE TYPE "Regiao" AS ENUM ('NORTE', 'NORDESTE', 'CENTRO_OESTE', 'SUDESTE', 'SUL');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "regioes" "Regiao"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoGenerico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,

    CONSTRAINT "ProdutoGenerico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLista" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "produtoGenericoId" TEXT,
    "nomePersonalizado" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ItemLista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" TEXT NOT NULL,
    "mercado" TEXT NOT NULL,
    "regiao" "Regiao" NOT NULL,
    "validade" TIMESTAMP(3) NOT NULL,
    "produto" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoGenerico_nome_key" ON "ProdutoGenerico"("nome");

-- AddForeignKey
ALTER TABLE "Lista" ADD CONSTRAINT "Lista_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLista" ADD CONSTRAINT "ItemLista_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "Lista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLista" ADD CONSTRAINT "ItemLista_produtoGenericoId_fkey" FOREIGN KEY ("produtoGenericoId") REFERENCES "ProdutoGenerico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
