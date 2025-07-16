/*
  Warnings:

  - A unique constraint covering the columns `[relatorio_id,membro_id,tipo]` on the table `presencas` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "presencas_relatorio_id_membro_id_key";

-- AlterTable
ALTER TABLE "presencas" ADD COLUMN     "tipo" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "presencas_relatorio_id_membro_id_tipo_key" ON "presencas"("relatorio_id", "membro_id", "tipo");
