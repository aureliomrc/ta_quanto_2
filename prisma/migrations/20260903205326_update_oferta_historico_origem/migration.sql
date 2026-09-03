-- CreateEnum
CREATE TYPE "OrigemOferta" AS ENUM ('SCANNER', 'SEFAZ');

-- DropForeignKey
ALTER TABLE "Oferta" DROP CONSTRAINT "Oferta_usuarioId_fkey";

-- AlterTable
ALTER TABLE "ItemLista" ADD COLUMN     "precoEstimado" DOUBLE PRECISION DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Oferta" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "origem" "OrigemOferta" NOT NULL DEFAULT 'SCANNER';

-- CreateIndex
CREATE INDEX "Oferta_usuarioId_idx" ON "Oferta"("usuarioId");

-- CreateIndex
CREATE INDEX "Oferta_regiao_mercado_idx" ON "Oferta"("regiao", "mercado");

-- CreateIndex
CREATE INDEX "Oferta_expiresAt_idx" ON "Oferta"("expiresAt");

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
