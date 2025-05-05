/*
  Warnings:

  - You are about to drop the column `membro_celula_id` on the `presencas` table. All the data in the column will be lost.
  - You are about to drop the `membros_celula` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[relatorio_id,membro_id,semana]` on the table `presencas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `membro_id` to the `presencas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "membros_celula" DROP CONSTRAINT "membros_celula_celula_id_fkey";

-- DropForeignKey
ALTER TABLE "membros_celula" DROP CONSTRAINT "membros_celula_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "presencas" DROP CONSTRAINT "presencas_membro_celula_id_fkey";

-- DropIndex
DROP INDEX "presencas_relatorio_id_membro_celula_id_semana_key";

-- AlterTable
ALTER TABLE "presencas" DROP COLUMN "membro_celula_id",
ADD COLUMN     "membro_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "membros_celula";

-- CreateTable
CREATE TABLE "membros" (
    "id" SERIAL NOT NULL,
    "celula_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "eh_consolidador" BOOLEAN NOT NULL DEFAULT false,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "presencas_relatorio_id_membro_id_semana_key" ON "presencas"("relatorio_id", "membro_id", "semana");

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_celula_id_fkey" FOREIGN KEY ("celula_id") REFERENCES "celulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
