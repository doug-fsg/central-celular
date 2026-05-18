-- DropForeignKey
ALTER TABLE "atribuicoes_cuidado" DROP CONSTRAINT "atribuicoes_cuidado_membro_id_fkey";

-- AlterTable
ALTER TABLE "atribuicoes_cuidado" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "atribuicoes_cuidado" ADD CONSTRAINT "atribuicoes_cuidado_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
