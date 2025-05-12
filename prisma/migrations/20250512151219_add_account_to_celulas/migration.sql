/*
  Warnings:

  - Added the required column `account_id` to the `celulas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "celulas" ADD COLUMN "account_id" INTEGER NOT NULL DEFAULT 1; -- ou outro valor padrão que faça sentido

-- AddForeignKey
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
