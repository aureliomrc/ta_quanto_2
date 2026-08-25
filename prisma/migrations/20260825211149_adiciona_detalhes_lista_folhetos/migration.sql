/*
  Warnings:

  - You are about to drop the column `nomePersonalizado` on the `ItemLista` table. All the data in the column will be lost.
  - You are about to drop the column `produtoGenericoId` on the `ItemLista` table. All the data in the column will be lost.
  - You are about to drop the `ProdutoGenerico` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `nome` to the `ItemLista` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ItemLista" DROP CONSTRAINT "ItemLista_produtoGenericoId_fkey";

-- DropForeignKey
ALTER TABLE "Oferta" DROP CONSTRAINT "Oferta_usuarioId_fkey";

-- AlterTable
ALTER TABLE "ItemLista" DROP COLUMN "nomePersonalizado",
DROP COLUMN "produtoGenericoId",
ADD COLUMN     "comprado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nome" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Lista" ADD COLUMN     "isPadrao" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Oferta" ALTER COLUMN "validade" DROP NOT NULL,
ALTER COLUMN "usuarioId" DROP NOT NULL;

-- DropTable
DROP TABLE "ProdutoGenerico";

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
