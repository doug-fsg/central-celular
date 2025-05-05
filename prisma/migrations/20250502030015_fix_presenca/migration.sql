/*
  Warnings:

  - You are about to drop the column `enviado` on the `relatorios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "relatorios" DROP COLUMN "enviado",
ALTER COLUMN "data_envio" DROP NOT NULL,
ALTER COLUMN "data_envio" DROP DEFAULT;
