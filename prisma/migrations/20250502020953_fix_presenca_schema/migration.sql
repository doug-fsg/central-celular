/*
  Warnings:

  - Made the column `data_envio` on table `relatorios` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "relatorios" ALTER COLUMN "data_envio" SET NOT NULL,
ALTER COLUMN "data_envio" SET DEFAULT CURRENT_TIMESTAMP;
