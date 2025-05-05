/*
  Warnings:

  - You are about to drop the column `foto_perfil` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `lider_destaque` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `meses_consecutivos` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `ultima_verificacao` on the `usuarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "foto_perfil",
DROP COLUMN "lider_destaque",
DROP COLUMN "meses_consecutivos",
DROP COLUMN "ultima_verificacao";
